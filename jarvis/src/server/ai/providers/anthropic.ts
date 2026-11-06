import "server-only";
import Anthropic, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  BadRequestError,
  InternalServerError,
  NotFoundError,
  OverloadedError,
  PermissionDeniedError,
  RateLimitError,
  ServiceUnavailableError,
} from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaContentBlockParam,
  BetaMessage,
  BetaMessageParam,
  BetaTextBlockParam,
  BetaToolResultBlockParam,
  BetaToolUnion,
  BetaToolUseBlock,
  MessageCreateParamsStreaming,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { ToolActivity } from "@/lib/shared/types";
import { fromHttpStatus, USER_MESSAGES } from "../errors";
import { executeTool, safeLabel, toolJsonSchema } from "../tools";
import {
  ProviderError,
  type ChatProvider,
  type ProviderEvent,
  type ProviderRunInput,
  type UsageInfo,
} from "../types";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface AnthropicProviderConfig {
  apiKey?: string;
  authToken?: string;
  baseUrl?: string;
  model: string;
  maxTokens: number;
  effortText?: Effort;
  effortVoice?: Effort;
  refusalFallback: boolean;
  webSearch: boolean;
  /** Nur für Tests: eigene fetch-Implementierung (z. B. aufgezeichnete SSE-Antworten). */
  fetch?: typeof fetch;
}

/** Maximale Anzahl an Werkzeug-Runden pro Nutzernachricht. */
const MAX_TOOL_ROUNDS = 6;
/** `fallbacks: "default"` (kategoriebasierte Ersatzmodelle) braucht diesen Beta-Header. */
const SERVER_FALLBACK_BETA = "server-side-fallback-2026-07-01";

/**
 * Wird gesetzt, wenn optionale Request-Felder (Beta-Header, effort, eager
 * streaming …) mit 400 abgelehnt wurden – z. B. bei älteren Modellen oder einer
 * Organisation ohne Beta-Freischaltung. Danach werden nur noch minimale
 * Anfragen gesendet.
 */
let compatibilityMode = false;

export function resetAnthropicCompatibilityMode() {
  compatibilityMode = false;
}

export function webSearchToolType(model: string): "web_search_20260209" | "web_search_20250305" {
  return /opus-(4-[6-9]|5)|sonnet-(4-6|5)|fable|mythos/.test(model)
    ? "web_search_20260209"
    : "web_search_20250305";
}

/** Fehler des Anthropic-SDK auf neutrale ProviderErrors abbilden (spezifischste zuerst). */
export function mapAnthropicError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  if (error instanceof APIUserAbortError) {
    return new ProviderError("aborted", USER_MESSAGES.aborted, { cause: error });
  }
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) {
    return new ProviderError("auth", USER_MESSAGES.auth, { status: error.status, cause: error });
  }
  if (error instanceof RateLimitError) {
    return new ProviderError("rate_limit", USER_MESSAGES.rate_limit, {
      status: 429,
      retryable: true,
      cause: error,
    });
  }
  if (error instanceof OverloadedError || error instanceof ServiceUnavailableError) {
    return new ProviderError("overloaded", USER_MESSAGES.overloaded, {
      status: error.status,
      retryable: true,
      cause: error,
    });
  }
  if (error instanceof InternalServerError) {
    return new ProviderError("internal", USER_MESSAGES.internal, {
      status: error.status,
      retryable: true,
      cause: error,
    });
  }
  if (error instanceof NotFoundError) {
    return new ProviderError(
      "bad_request",
      "Das konfigurierte Claude-Modell wurde nicht gefunden. Prüfe ANTHROPIC_MODEL.",
      { status: 404, cause: error },
    );
  }
  if (error instanceof BadRequestError) {
    return new ProviderError("bad_request", USER_MESSAGES.bad_request, { status: 400, cause: error });
  }
  // APIConnectionTimeoutError ist eine Unterklasse von APIConnectionError.
  if (error instanceof APIConnectionTimeoutError) {
    return new ProviderError("timeout", USER_MESSAGES.timeout, { retryable: true, cause: error });
  }
  if (error instanceof APIConnectionError) {
    return new ProviderError("network", USER_MESSAGES.network, { retryable: true, cause: error });
  }
  return fromHttpStatus(error);
}

/**
 * Nach einem Modellwechsel mitten in der Antwort (Refusal-Fallback) dürfen
 * thinking-, tool_use- und ungepaarte server_tool_use-Blöcke VOR dem letzten
 * fallback-Block nicht zurückgesendet werden.
 */
export function prepareAssistantEcho(content: BetaContentBlock[]): BetaContentBlockParam[] {
  const lastFallback = content.map((b) => b.type).lastIndexOf("fallback");
  if (lastFallback === -1) return content as unknown as BetaContentBlockParam[];

  const resultIds = new Set(
    content
      .slice(0, lastFallback)
      .filter((b) => b.type === "web_search_tool_result" || b.type === "web_fetch_tool_result")
      .map((b) => (b as { tool_use_id: string }).tool_use_id),
  );
  const kept = content.filter((block, index) => {
    if (index === lastFallback) return false; // reiner Audit-Marker
    if (index > lastFallback) return true;
    switch (block.type) {
      case "text":
      case "web_search_tool_result":
      case "web_fetch_tool_result":
        return true;
      case "server_tool_use":
        return resultIds.has(block.id);
      default:
        return false;
    }
  });
  return kept as unknown as BetaContentBlockParam[];
}

export function createAnthropicProvider(config: AnthropicProviderConfig): ChatProvider {
  const client = new Anthropic({
    apiKey: config.apiKey ?? null,
    authToken: config.authToken ?? null,
    baseURL: config.baseUrl,
    maxRetries: 2,
    timeout: 300_000,
    ...(config.fetch ? { fetch: config.fetch } : {}),
  });

  return {
    id: "anthropic",
    label: "Anthropic Claude",
    model: config.model,

    async *run(input: ProviderRunInput): AsyncGenerator<ProviderEvent, void, void> {
      const toolMap = new Map(input.tools.map((tool) => [tool.name, tool]));
      const effort = input.mode === "voice" ? config.effortVoice : config.effortText;
      // Prompt-Caching: Tools + stabiler System-Teil bilden ein gleichbleibendes Präfix.
      const system: BetaTextBlockParam[] = [
        { type: "text", text: input.system.stable, cache_control: { type: "ephemeral" } },
        { type: "text", text: input.system.dynamic },
      ];
      const messages: BetaMessageParam[] = input.history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const usage: UsageInfo = { inputTokens: 0, outputTokens: 0 };
      let minimal = compatibilityMode;
      let jsonRetries = 0;
      let toolRounds = 0;
      let pauseResumes = 0;
      let anyText = false;
      let textInRound = false;
      let model = config.model;

      const buildParams = (): MessageCreateParamsStreaming => {
        // Ein Gateway/Proxy (eigene BASE_URL) kennt evtl. neuere Felder nicht.
        const useOptional = !minimal && !config.baseUrl;
        const tools: BetaToolUnion[] = input.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: toolJsonSchema(tool),
          ...(useOptional ? { eager_input_streaming: true } : {}),
        }));
        if (config.webSearch) {
          tools.push({ type: webSearchToolType(config.model), name: "web_search", max_uses: 3 });
        }
        return {
          model: config.model,
          max_tokens: config.maxTokens,
          system,
          messages,
          stream: true,
          ...(tools.length > 0 ? { tools } : {}),
          ...(!minimal && effort ? { output_config: { effort } } : {}),
          ...(useOptional && config.refusalFallback
            ? { fallbacks: "default" as const, betas: [SERVER_FALLBACK_BETA] }
            : {}),
        };
      };

      while (true) {
        let message: BetaMessage;
        textInRound = false;
        try {
          const stream = client.beta.messages.stream(buildParams(), { signal: input.signal });
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              let delta = event.delta.text;
              if (!textInRound && anyText && delta) delta = `\n\n${delta.trimStart()}`;
              if (delta) {
                textInRound = true;
                anyText = true;
                yield { type: "text", delta };
              }
            } else if (event.type === "content_block_start") {
              const block = event.content_block;
              if (block.type === "server_tool_use" && block.name === "web_search") {
                yield {
                  type: "tool",
                  activity: { id: block.id, name: "web_search", label: "Websuche", status: "running" },
                };
              } else if (block.type === "web_search_tool_result") {
                // Erfolg: Liste von Ergebnissen; Fehler: ein einzelnes Fehlerobjekt (kein throw!).
                const sources = Array.isArray(block.content) ? block.content.length : null;
                yield {
                  type: "tool",
                  activity: {
                    id: block.tool_use_id,
                    name: "web_search",
                    label: "Websuche",
                    status: sources === null ? "error" : "success",
                    detail: sources === null ? "Suche fehlgeschlagen" : `${sources} Quellen`,
                  },
                };
              } else if (block.type === "fallback") {
                yield {
                  type: "notice",
                  message: `Antwort wird von ${block.to.model} fortgesetzt (Sicherheits-Fallback).`,
                };
              }
            }
          }
          message = await stream.finalMessage();
          jsonRetries = 0;
        } catch (error) {
          if (input.signal.aborted || error instanceof APIUserAbortError) {
            throw new ProviderError("aborted", USER_MESSAGES.aborted, { cause: error });
          }
          if (error instanceof APIError) {
            // Optionale Felder abgelehnt (z. B. organization_not_enrolled_in_beta oder ein
            // älteres Modell ohne `effort`): einmal mit minimaler Anfrage wiederholen.
            if (error instanceof BadRequestError && !minimal && !anyText) {
              console.warn(
                `[jarvis] Anthropic lehnte die Anfrage ab (${error.errorCode ?? error.type ?? "400"}: ${error.apiMessage ?? error.message}). ` +
                  "Wiederhole ohne optionale Funktionen.",
              );
              minimal = true;
              compatibilityMode = true;
              continue;
            }
            throw mapAnthropicError(error);
          }
          // Kein API-Fehler: Werkzeug-Eingabe war kein gültiges JSON (eager streaming).
          // Der Turn wurde nie angehängt – also einfach erneut senden (max. 2×).
          if (jsonRetries++ < 2) {
            console.warn("[jarvis] Werkzeug-Eingabe nicht lesbar – Anfrage wird wiederholt.", error);
            continue;
          }
          throw new ProviderError("internal", USER_MESSAGES.internal, { cause: error });
        }

        model = message.model;
        usage.inputTokens =
          (usage.inputTokens ?? 0) +
          message.usage.input_tokens +
          (message.usage.cache_read_input_tokens ?? 0) +
          (message.usage.cache_creation_input_tokens ?? 0);
        usage.outputTokens = (usage.outputTokens ?? 0) + message.usage.output_tokens;

        const stopReason = message.stop_reason ?? "end_turn";

        if (stopReason === "refusal") {
          console.warn("[jarvis] Anfrage abgelehnt:", message.stop_details?.category ?? "unbekannt");
          if (!anyText) yield { type: "text", delta: USER_MESSAGES.refusal };
          yield { type: "done", stopReason, model, usage };
          return;
        }

        if (stopReason === "pause_turn") {
          // Serverseitiges Werkzeug (Websuche) pausiert – Turn zurücksenden, Server setzt fort.
          if (pauseResumes++ >= 3) {
            yield { type: "done", stopReason, model, usage };
            return;
          }
          messages.push({ role: "assistant", content: prepareAssistantEcho(message.content) });
          continue;
        }

        const toolUses = message.content.filter(
          (block): block is BetaToolUseBlock => block.type === "tool_use",
        );

        if (stopReason === "max_tokens") {
          // Eine abgeschnittene Werkzeug-Eingabe kann trotzdem "gültig" aussehen – nicht ausführen.
          yield { type: "notice", message: "Die Antwort wurde wegen der Längenbegrenzung gekürzt." };
          yield { type: "done", stopReason, model, usage };
          return;
        }

        if (stopReason !== "tool_use" || toolUses.length === 0) {
          yield { type: "done", stopReason, model, usage };
          return;
        }

        if (toolRounds++ >= MAX_TOOL_ROUNDS) {
          yield { type: "notice", message: "Zu viele Werkzeugaufrufe in Folge – Vorgang beendet." };
          yield { type: "done", stopReason: "tool_limit", model, usage };
          return;
        }

        messages.push({ role: "assistant", content: prepareAssistantEcho(message.content) });

        for (const call of toolUses) {
          const tool = toolMap.get(call.name);
          const activity: ToolActivity = {
            id: call.id,
            name: call.name,
            label: tool ? safeLabel(tool, call.input) : call.name,
            status: "running",
          };
          yield { type: "tool", activity };
        }

        // Parallele Werkzeugaufrufe gleichzeitig ausführen; alle Ergebnisse in EINER Nachricht zurück.
        const executions = await Promise.all(
          toolUses.map((call) =>
            executeTool(toolMap.get(call.name), call.name, call.id, call.input, input.toolContext),
          ),
        );
        const results: BetaToolResultBlockParam[] = [];
        for (const [index, execution] of executions.entries()) {
          yield { type: "tool", activity: execution.activity };
          results.push({
            type: "tool_result",
            tool_use_id: toolUses[index].id,
            content: execution.result.content,
            ...(execution.result.ok ? {} : { is_error: true }),
          });
        }
        messages.push({ role: "user", content: results });
      }
    },
  };
}
