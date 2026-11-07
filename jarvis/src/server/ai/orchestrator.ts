import "server-only";
import type {
  AssistantMode,
  ChatStreamEvent,
  MessageStatus,
  ToolActivity,
} from "@/lib/shared/types";
import { getEnv } from "@/server/config/env";
import {
  createConversation,
  getConversation,
  insertMessage,
  recentMessages,
  touchConversation,
} from "@/server/db/repositories/conversations";
import { listMemories } from "@/server/db/repositories/memories";
import { ensureUser, getProfile } from "@/server/db/repositories/users";
import { activeTools, skillPromptHints } from "@/server/skills/registry";
import { fromHttpStatus, isAbortError, SHORT_REASONS } from "./errors";
import { buildSystemPrompt } from "./prompt";
import { getProviderSetup } from "./registry";
import {
  ProviderError,
  type ChatProvider,
  type HistoryMessage,
  type ProviderCredentials,
  type UsageInfo,
} from "./types";

export const HISTORY_MESSAGE_LIMIT = 40;
export const HISTORY_CHAR_BUDGET = 120_000;

export interface ChatTurnInput {
  userId: string;
  conversationId?: string | null;
  message: string;
  mode: AssistantMode;
  timezone?: string;
  signal: AbortSignal;
  /** Pro Anfrage ermittelte Zugangsdaten (z. B. OIDC-Token fürs Vercel AI Gateway). */
  credentials?: ProviderCredentials;
}

/** Titel aus der ersten Nachricht: erste Zeile, ohne Markdown, an Wortgrenze gekürzt. */
export function deriveTitle(message: string, maxLength = 60): string {
  const firstLine =
    message
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? "";
  const clean = firstLine
    .replace(/[`*_#>~[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "Neue Unterhaltung";
  const title =
    clean.length <= maxLength
      ? clean
      : `${clean.slice(0, maxLength).replace(/\s+\S*$/, "") || clean.slice(0, maxLength)}…`;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  status: MessageStatus;
}

/** Jüngste Nachrichten innerhalb des Zeichenbudgets; beginnt immer mit einer Nutzernachricht. */
export function buildHistory(rows: StoredMessage[], charBudget = HISTORY_CHAR_BUDGET): HistoryMessage[] {
  const history: HistoryMessage[] = [];
  let used = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    let content = row.content.trim();
    if (!content) continue;
    if (row.role === "assistant" && row.status !== "complete") content += " …[Antwort unterbrochen]";
    if (used + content.length > charBudget && history.length > 0) break;
    used += content.length;
    history.unshift({ role: row.role, content });
  }
  while (history.length > 0 && history[0].role !== "user") history.shift();
  return history;
}

function serverTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin";
}

export async function* runChatTurn(input: ChatTurnInput): AsyncGenerator<ChatStreamEvent, void, void> {
  const env = getEnv();
  const startedAt = Date.now();
  const timezone = input.timezone ?? serverTimeZone();

  await ensureUser(input.userId);
  const profile = await getProfile(input.userId);

  let conversation = input.conversationId
    ? await getConversation(input.userId, input.conversationId)
    : null;
  const isNewConversation = !conversation;
  if (!conversation) conversation = await createConversation(input.userId, deriveTitle(input.message));

  const userMessage = await insertMessage({
    conversationId: conversation.id,
    role: "user",
    content: input.message,
    createdAt: startedAt,
  });

  const setup = getProviderSetup();
  const chain = [setup.primary, setup.fallback].filter((p): p is ChatProvider => p !== null);
  const assistantMessageId = crypto.randomUUID();

  yield {
    type: "meta",
    conversationId: conversation.id,
    userMessageId: userMessage.id,
    assistantMessageId,
    provider: setup.primary.id,
    model: setup.primary.model,
    isNewConversation,
  };

  const history = buildHistory(
    (await recentMessages(conversation.id, HISTORY_MESSAGE_LIMIT)).map((row) => ({
      role: row.role,
      content: row.content,
      status: row.status,
    })),
  );
  const memories = env.SKILL_MEMORY ? await listMemories(input.userId, 40) : [];
  const tools = activeTools();
  const system = buildSystemPrompt({
    profile,
    mode: input.mode,
    memories,
    skillHints: skillPromptHints(),
    webSearch: setup.primary.id === "anthropic" && env.ANTHROPIC_WEB_SEARCH,
    timezone,
  });
  const toolContext = { userId: input.userId, profile, timezone, signal: input.signal };

  let text = "";
  const activities = new Map<string, ToolActivity>();
  let stopReason = "end_turn";
  let usage: UsageInfo | undefined;
  let usedProvider = setup.primary;
  let model = setup.primary.model;
  let firstTokenAt: number | null = null;
  let failure: ProviderError | null = null;
  let persisted = false;

  const persist = async () => {
    if (persisted) return;
    persisted = true;
    const status: MessageStatus = failure ? (text ? "partial" : "error") : stopReason === "aborted" ? "partial" : "complete";
    try {
      if (text.trim() || activities.size > 0) {
        await insertMessage({
          id: assistantMessageId,
          conversationId: conversation.id,
          role: "assistant",
          content: text,
          status,
          meta: {
            provider: usedProvider.id,
            model,
            tools: [...activities.values()],
            stopReason,
            latencyMs: firstTokenAt ? firstTokenAt - startedAt : undefined,
          },
          // Sicherstellen, dass die Antwort nach der Frage einsortiert wird.
          createdAt: Math.max(Date.now(), userMessage.createdAt + 1),
        });
      }
      await touchConversation(conversation.id);
    } catch (error) {
      console.error("[jarvis] Antwort konnte nicht gespeichert werden:", error);
    }
  };

  try {
    for (let index = 0; index < chain.length; index++) {
      const provider = chain[index];
      usedProvider = provider;
      model = provider.model;
      try {
        for await (const event of provider.run({
          system,
          history,
          tools,
          toolContext,
          mode: input.mode,
          signal: input.signal,
          credentials: input.credentials,
        })) {
          if (event.type === "text") {
            firstTokenAt ??= Date.now();
            text += event.delta;
            yield event;
          } else if (event.type === "tool") {
            activities.set(event.activity.id, event.activity);
            yield event;
          } else if (event.type === "notice") {
            yield event;
          } else {
            stopReason = event.stopReason;
            usage = event.usage;
            model = event.model;
          }
        }
        failure = null;
        break;
      } catch (error) {
        if (input.signal.aborted || isAbortError(error)) {
          stopReason = "aborted";
          failure = null;
          break;
        }
        const providerError = error instanceof ProviderError ? error : fromHttpStatus(error);
        console.error(
          `[jarvis] Anbieter "${provider.id}" fehlgeschlagen (${providerError.code}):`,
          providerError.cause ?? providerError,
        );
        const next = chain[index + 1];
        // Nur wechseln, solange noch nichts ausgegeben/ausgeführt wurde.
        if (next && !text && activities.size === 0) {
          yield {
            type: "notice",
            message: `${provider.label} ist gerade nicht verfügbar (${SHORT_REASONS[providerError.code]}) – wechsle zu ${next.label}.`,
          };
          continue;
        }
        failure = providerError;
        stopReason = "error";
        break;
      }
    }

    await persist();

    if (failure) {
      yield { type: "error", code: failure.code, message: failure.message, retryable: failure.retryable };
      return;
    }
    yield {
      type: "done",
      stopReason,
      title: conversation.title,
      latencyMs: firstTokenAt ? firstTokenAt - startedAt : Date.now() - startedAt,
      usage,
    };
  } finally {
    // Läuft auch, wenn der Client die Verbindung trennt (Generator wird beendet).
    if (!persisted) {
      if (stopReason === "end_turn") stopReason = "aborted";
      await persist();
    }
  }
}
