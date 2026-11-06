import "server-only";
import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  BadRequestError,
  InternalServerError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
} from "openai";
import type {
  ChatCompletionFunctionTool,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions/completions";
import { fromHttpStatus, USER_MESSAGES } from "../errors";
import { executeTool, safeLabel, toolJsonSchema } from "../tools";
import {
  ProviderError,
  type ChatProvider,
  type ProviderEvent,
  type ProviderRunInput,
  type UsageInfo,
} from "../types";

export interface OpenAIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  /** Nur für Tests: eigene fetch-Implementierung. */
  fetch?: typeof fetch;
}

const MAX_TOOL_ROUNDS = 6;

export function mapOpenAIError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  if (error instanceof APIUserAbortError) {
    return new ProviderError("aborted", USER_MESSAGES.aborted, { cause: error });
  }
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) {
    return new ProviderError("auth", USER_MESSAGES.auth, { status: error.status, cause: error });
  }
  if (error instanceof RateLimitError) {
    return new ProviderError("rate_limit", USER_MESSAGES.rate_limit, { status: 429, retryable: true, cause: error });
  }
  if (error instanceof InternalServerError) {
    return new ProviderError("overloaded", USER_MESSAGES.overloaded, {
      status: error.status,
      retryable: true,
      cause: error,
    });
  }
  if (error instanceof NotFoundError) {
    return new ProviderError("bad_request", "Das konfigurierte OpenAI-Modell wurde nicht gefunden. Prüfe OPENAI_MODEL.", {
      status: 404,
      cause: error,
    });
  }
  if (error instanceof BadRequestError) {
    return new ProviderError("bad_request", USER_MESSAGES.bad_request, { status: 400, cause: error });
  }
  if (error instanceof APIConnectionTimeoutError) {
    return new ProviderError("timeout", USER_MESSAGES.timeout, { retryable: true, cause: error });
  }
  if (error instanceof APIConnectionError) {
    return new ProviderError("network", USER_MESSAGES.network, { retryable: true, cause: error });
  }
  if (error instanceof APIError) return fromHttpStatus(error);
  return fromHttpStatus(error);
}

interface PendingCall {
  id: string;
  name: string;
  args: string;
}

export function createOpenAIProvider(config: OpenAIProviderConfig): ChatProvider {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    maxRetries: 2,
    timeout: 300_000,
    ...(config.fetch ? { fetch: config.fetch } : {}),
  });
  const compatServer = Boolean(config.baseUrl);

  return {
    id: "openai",
    label: compatServer ? "OpenAI-kompatibel" : "OpenAI",
    model: config.model,

    async *run(input: ProviderRunInput): AsyncGenerator<ProviderEvent, void, void> {
      const toolMap = new Map(input.tools.map((tool) => [tool.name, tool]));
      const tools: ChatCompletionFunctionTool[] = input.tools.map((tool) => ({
        type: "function",
        function: { name: tool.name, description: tool.description, parameters: toolJsonSchema(tool) },
      }));
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: `${input.system.stable}\n\n${input.system.dynamic}` },
        ...input.history.map((m) => ({ role: m.role, content: m.content }) as ChatCompletionMessageParam),
      ];
      const usage: UsageInfo = { inputTokens: 0, outputTokens: 0 };
      let anyText = false;
      let model = config.model;

      for (let round = 0; ; round++) {
        let text = "";
        let finishReason: string | null = null;
        const calls = new Map<number, PendingCall>();

        try {
          const stream = await client.chat.completions.create(
            {
              model: config.model,
              messages,
              stream: true,
              ...(tools.length > 0 ? { tools } : {}),
              ...(compatServer ? {} : { stream_options: { include_usage: true } }),
            },
            { signal: input.signal },
          );

          for await (const chunk of stream) {
            if (chunk.model) model = chunk.model;
            if (chunk.usage) {
              usage.inputTokens = (usage.inputTokens ?? 0) + (chunk.usage.prompt_tokens ?? 0);
              usage.outputTokens = (usage.outputTokens ?? 0) + (chunk.usage.completion_tokens ?? 0);
            }
            const choice = chunk.choices[0];
            if (!choice) continue;
            const content = choice.delta?.content;
            if (content) {
              const delta = !text && anyText ? `\n\n${content.trimStart()}` : content;
              text += content;
              anyText = true;
              yield { type: "text", delta };
            }
            for (const call of choice.delta?.tool_calls ?? []) {
              const entry = calls.get(call.index) ?? { id: "", name: "", args: "" };
              if (call.id) entry.id = call.id;
              if (call.function?.name) entry.name += call.function.name;
              if (call.function?.arguments) entry.args += call.function.arguments;
              calls.set(call.index, entry);
            }
            if (choice.finish_reason) finishReason = choice.finish_reason;
          }
        } catch (error) {
          if (input.signal.aborted) {
            throw new ProviderError("aborted", USER_MESSAGES.aborted, { cause: error });
          }
          throw mapOpenAIError(error);
        }

        if (finishReason === "length") {
          yield { type: "notice", message: "Die Antwort wurde wegen der Längenbegrenzung gekürzt." };
          yield { type: "done", stopReason: "max_tokens", model, usage };
          return;
        }
        if (finishReason === "content_filter") {
          if (!anyText) yield { type: "text", delta: USER_MESSAGES.refusal };
          yield { type: "done", stopReason: "refusal", model, usage };
          return;
        }

        const pending = [...calls.values()].filter((call) => call.name);
        if (pending.length === 0) {
          yield { type: "done", stopReason: finishReason ?? "stop", model, usage };
          return;
        }
        if (round >= MAX_TOOL_ROUNDS) {
          yield { type: "notice", message: "Zu viele Werkzeugaufrufe in Folge – Vorgang beendet." };
          yield { type: "done", stopReason: "tool_limit", model, usage };
          return;
        }

        pending.forEach((call, index) => {
          if (!call.id) call.id = `call_${round}_${index}`;
        });
        messages.push({
          role: "assistant",
          content: text || null,
          tool_calls: pending.map((call) => ({
            id: call.id,
            type: "function" as const,
            function: { name: call.name, arguments: call.args || "{}" },
          })),
        });

        const parsedInputs = pending.map((call) => {
          try {
            return JSON.parse(call.args || "{}") as unknown;
          } catch {
            return { __invalid_json__: call.args };
          }
        });

        for (const [index, call] of pending.entries()) {
          const tool = toolMap.get(call.name);
          yield {
            type: "tool",
            activity: {
              id: call.id,
              name: call.name,
              label: tool ? safeLabel(tool, parsedInputs[index]) : call.name,
              status: "running",
            },
          };
        }

        const executions = await Promise.all(
          pending.map((call, index) =>
            executeTool(toolMap.get(call.name), call.name, call.id, parsedInputs[index], input.toolContext),
          ),
        );
        for (const [index, execution] of executions.entries()) {
          yield { type: "tool", activity: execution.activity };
          messages.push({ role: "tool", tool_call_id: pending[index].id, content: execution.result.content });
        }
      }
    },
  };
}
