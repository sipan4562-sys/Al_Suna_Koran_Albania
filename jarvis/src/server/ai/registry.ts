import "server-only";
import { getEnv } from "@/server/config/env";
import { createAnthropicProvider } from "./providers/anthropic";
import { createDemoProvider } from "./providers/demo";
import { createOpenAIProvider } from "./providers/openai";
import type { ChatProvider, ProviderId } from "./types";

/**
 * Zentrale Stelle, an der KI-Anbieter aus der Konfiguration erzeugt werden.
 * Einen neuen Anbieter integrieren:
 *   1. `ChatProvider` in `providers/<name>.ts` implementieren.
 *   2. Hier in `buildProvider` ergänzen (+ Env-Variablen in `config/env.ts`).
 */

export interface ProviderSetup {
  primary: ChatProvider;
  fallback: ChatProvider | null;
  /** true, wenn kein echter KI-Anbieter konfiguriert ist. */
  demo: boolean;
}

let cached: ProviderSetup | null = null;

function buildProvider(id: ProviderId): ChatProvider | null {
  const env = getEnv();
  switch (id) {
    case "anthropic":
      if (!env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) return null;
      return createAnthropicProvider({
        apiKey: env.ANTHROPIC_API_KEY,
        authToken: env.ANTHROPIC_API_KEY ? undefined : env.ANTHROPIC_AUTH_TOKEN,
        baseUrl: env.ANTHROPIC_BASE_URL,
        model: env.ANTHROPIC_MODEL,
        maxTokens: env.ANTHROPIC_MAX_TOKENS,
        effortText: env.ANTHROPIC_EFFORT_TEXT,
        effortVoice: env.ANTHROPIC_EFFORT_VOICE,
        refusalFallback: env.ANTHROPIC_REFUSAL_FALLBACK,
        webSearch: env.ANTHROPIC_WEB_SEARCH,
      });
    case "openai":
      // Lokale OpenAI-kompatible Server (Ollama, LM Studio) brauchen oft keinen Schlüssel.
      if (!env.OPENAI_API_KEY && !env.OPENAI_BASE_URL) return null;
      return createOpenAIProvider({
        apiKey: env.OPENAI_API_KEY ?? "not-required",
        baseUrl: env.OPENAI_BASE_URL,
        model: env.OPENAI_MODEL,
      });
    case "demo":
      return createDemoProvider();
    default:
      return null;
  }
}

function resolvePrimaryId(): ProviderId {
  const env = getEnv();
  if (env.AI_PROVIDER !== "auto") return env.AI_PROVIDER;
  if (env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN) return "anthropic";
  if (env.OPENAI_API_KEY || env.OPENAI_BASE_URL) return "openai";
  return "demo";
}

export function getProviderSetup(): ProviderSetup {
  if (cached) return cached;
  const env = getEnv();
  const primaryId = resolvePrimaryId();
  let primary = buildProvider(primaryId);
  if (!primary) {
    console.warn(
      `[jarvis] AI_PROVIDER=${primaryId}, aber es fehlt der API-Schlüssel – starte im Demo-Modus.`,
    );
    primary = createDemoProvider();
  }

  let fallback: ChatProvider | null = null;
  const fallbackId = env.AI_FALLBACK_PROVIDER?.toLowerCase() as ProviderId | undefined;
  if (fallbackId && fallbackId !== primary.id) {
    fallback = buildProvider(fallbackId);
    if (!fallback) console.warn(`[jarvis] Fallback-Anbieter "${fallbackId}" ist nicht konfiguriert.`);
  }

  cached = { primary, fallback, demo: primary.id === "demo" };
  return cached;
}

/** Nur für Tests. */
export function resetProviderCache(): void {
  cached = null;
}
