/**
 * Typen, die von Browser und Server gemeinsam genutzt werden.
 * Diese Datei darf keine Laufzeit-Abhängigkeiten importieren.
 */

export type AssistantMode = "voice" | "text";
export type ChatRole = "user" | "assistant";
export type MessageStatus = "complete" | "partial" | "error";

export interface ToolActivity {
  id: string;
  name: string;
  label: string;
  status: "running" | "success" | "error";
  detail?: string;
}

export interface MessageMeta {
  provider?: string;
  model?: string;
  tools?: ToolActivity[];
  stopReason?: string;
  latencyMs?: number;
}

export interface ChatMessageDTO {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  status: MessageStatus;
  createdAt: string;
  meta?: MessageMeta | null;
}

export interface ConversationDTO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
}

export interface MemoryDTO {
  id: string;
  content: string;
  category: string;
  createdAt: string;
}

export const PERSONALITIES = ["classic", "friendly", "concise", "witty"] as const;
export type Personality = (typeof PERSONALITIES)[number];

export const LANGUAGES = ["de-DE", "en-US", "en-GB", "fr-FR", "es-ES", "it-IT", "tr-TR"] as const;
export type AssistantLanguage = (typeof LANGUAGES)[number];

/** Serverseitig gespeichertes Benutzerprofil. */
export interface ProfileSettings {
  userName: string;
  formOfAddress: string;
  personality: Personality;
  customInstructions: string;
  language: AssistantLanguage;
  homeCity: string;
}

export const DEFAULT_PROFILE: ProfileSettings = {
  userName: "",
  formOfAddress: "",
  personality: "classic",
  customInstructions: "",
  language: "de-DE",
  homeCity: "",
};

/** Ereignisse, die /api/chat als NDJSON-Stream sendet. */
export type ChatStreamEvent =
  | {
      type: "meta";
      conversationId: string;
      userMessageId: string;
      assistantMessageId: string;
      provider: string;
      model: string;
      isNewConversation: boolean;
    }
  | { type: "text"; delta: string }
  | { type: "tool"; activity: ToolActivity }
  | { type: "notice"; message: string }
  | {
      type: "done";
      stopReason: string;
      title: string;
      latencyMs: number;
      usage?: { inputTokens?: number; outputTokens?: number };
    }
  | { type: "error"; code: ErrorCode; message: string; retryable: boolean };

export type ErrorCode =
  | "auth"
  | "rate_limit"
  | "quota"
  | "overloaded"
  | "network"
  | "bad_request"
  | "refusal"
  | "not_configured"
  | "timeout"
  | "aborted"
  | "internal";

export type ModuleStatus = "online" | "standby" | "offline" | "planned";

export interface SystemModule {
  id: string;
  name: string;
  description: string;
  status: ModuleStatus;
}

export interface SystemStatus {
  online: boolean;
  version: string;
  ai: {
    provider: string;
    providerLabel: string;
    model: string;
    fallback: string | null;
    demo: boolean;
  };
  speech: {
    serverTts: "openai" | "elevenlabs" | null;
    serverStt: "openai" | null;
  };
  storage: {
    driver: "file" | "remote" | "memory";
    persistent: boolean;
  };
  auth: { enabled: boolean };
  modules: SystemModule[];
  memoryCount: number;
  conversationCount: number;
  serverTime: string;
}
