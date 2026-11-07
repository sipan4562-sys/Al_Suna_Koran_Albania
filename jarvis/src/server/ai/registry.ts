import "server-only";
import { getEnv } from "@/server/config/env";
import { localOidcToken, resolveGatewayToken } from "./gateway-auth";
import { createAnthropicProvider } from "./providers/anthropic";
import { createDemoProvider } from "./providers/demo";
import { createGatewayProvider } from "./providers/gateway";
import { createOpenAIProvider } from "./providers/openai";
import type { ChatProvider, ProviderCredentials, ProviderId } from "./types";

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
    case "gateway":
      // Zugang pro Anfrage (OIDC-Token bzw. AI_GATEWAY_API_KEY) – siehe requestCredentials().
      return createGatewayProvider({
        model: env.AI_GATEWAY_MODEL,
        fallbackModels: env.AI_GATEWAY_FALLBACK_MODELS,
        effortText: env.AI_GATEWAY_EFFORT_TEXT,
        effortVoice: env.AI_GATEWAY_EFFORT_VOICE,
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
  // Auf Vercel ohne eigenen Schlüssel: Vercel AI Gateway mit dem OIDC-Token der Funktion.
  if (env.AI_GATEWAY_API_KEY || env.VERCEL || localOidcToken()) return "gateway";
  return "demo";
}

/** Ohne eigene Vorgabe: Fällt das Gateway aus (z. B. Guthaben leer), antwortet JARVIS im Demo-Modus. */
function resolveFallbackId(primaryId: ProviderId): ProviderId | undefined {
  const configured = getEnv().AI_FALLBACK_PROVIDER?.toLowerCase();
  if (configured === "none") return undefined;
  if (configured) return configured as ProviderId;
  return primaryId === "gateway" ? "demo" : undefined;
}

export function getProviderSetup(): ProviderSetup {
  if (cached) return cached;
  const primaryId = resolvePrimaryId();
  let primary = buildProvider(primaryId);
  if (!primary) {
    console.warn(
      `[jarvis] AI_PROVIDER=${primaryId}, aber es fehlt der API-Schlüssel – starte im Demo-Modus.`,
    );
    primary = createDemoProvider();
  }

  let fallback: ChatProvider | null = null;
  const fallbackId = resolveFallbackId(primary.id);
  if (fallbackId && fallbackId !== primary.id) {
    // Springt der Demo-Modus nur ein, passt der Hinweis auf fehlende Schlüssel nicht.
    fallback = fallbackId === "demo" ? createDemoProvider({ setupHint: false }) : buildProvider(fallbackId);
    if (!fallback) console.warn(`[jarvis] Fallback-Anbieter "${fallbackId}" ist nicht konfiguriert.`);
  }

  cached = { primary, fallback, demo: primary.id === "demo" };
  return cached;
}

/**
 * Zugangsdaten, die erst pro Anfrage feststehen. Muss in der API-Route (im
 * Kontext der eingehenden Anfrage) aufgerufen werden, bevor gestreamt wird.
 */
export function requestCredentials(headers: Headers): ProviderCredentials {
  const { primary, fallback } = getProviderSetup();
  const usesGateway = primary.id === "gateway" || fallback?.id === "gateway";
  return usesGateway ? { gatewayToken: resolveGatewayToken(headers) } : {};
}

/** Nur für Tests. */
export function resetProviderCache(): void {
  cached = null;
}
