import "server-only";
import type { z } from "zod";
import type {
  AssistantMode,
  ErrorCode,
  ProfileSettings,
  ToolActivity,
} from "@/lib/shared/types";

/** Neutrales Nachrichtenformat – unabhängig vom KI-Anbieter. */
export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * System-Prompt in zwei Teilen: `stable` ändert sich selten und wird (wo
 * möglich) gecacht, `dynamic` enthält Uhrzeit, Erinnerungen usw.
 */
export interface SystemPrompt {
  stable: string;
  dynamic: string;
}

export interface ToolContext {
  userId: string;
  profile: ProfileSettings;
  timezone: string;
  signal: AbortSignal;
}

export interface ToolResult {
  ok: boolean;
  /** Inhalt für das Sprachmodell (meist kompaktes JSON). */
  content: string;
  /** Kurze, menschenlesbare Zusammenfassung für die Oberfläche. */
  summary?: string;
}

export interface ToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  /** Beschriftung in der Oberfläche, z. B. "Wetter für Berlin". */
  label: (input: Partial<TInput>) => string;
  run: (input: TInput, ctx: ToolContext) => Promise<ToolResult>;
}

// Werkzeuge mit unterschiedlichen Eingabetypen in einer Liste halten.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyToolDefinition = ToolDefinition<any>;

export interface UsageInfo {
  inputTokens?: number;
  outputTokens?: number;
}

export type ProviderEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; activity: ToolActivity }
  | { type: "notice"; message: string }
  | { type: "done"; stopReason: string; model: string; usage?: UsageInfo };

/**
 * Zugangsdaten, die erst pro Anfrage feststehen – z. B. der OIDC-Token einer
 * Vercel-Funktion, mit dem sich JARVIS ohne eigenen API-Schlüssel beim
 * Vercel AI Gateway anmeldet. Verlassen nie den Server.
 */
export interface ProviderCredentials {
  gatewayToken?: string;
}

export interface ProviderRunInput {
  system: SystemPrompt;
  /** Gesprächsverlauf, endet mit der aktuellen Nutzernachricht. */
  history: HistoryMessage[];
  tools: AnyToolDefinition[];
  toolContext: ToolContext;
  mode: AssistantMode;
  signal: AbortSignal;
  credentials?: ProviderCredentials;
}

export type ProviderId = "anthropic" | "openai" | "gateway" | "demo";

export interface ChatProvider {
  id: ProviderId;
  label: string;
  model: string;
  run(input: ProviderRunInput): AsyncGenerator<ProviderEvent, void, void>;
}

export class ProviderError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    code: ErrorCode,
    message: string,
    options: { retryable?: boolean; status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ProviderError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }
}
