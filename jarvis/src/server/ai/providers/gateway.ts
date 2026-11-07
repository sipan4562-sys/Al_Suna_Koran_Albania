import "server-only";
import type { GatewayEffort } from "@/server/config/env";
import { ProviderError, type ChatProvider, type ProviderRunInput } from "../types";
import { createOpenAIProvider, mapOpenAIError } from "./openai";

/**
 * Vercel AI Gateway: ein Zugang zu vielen Modellen (OpenAI, Google, Anthropic …)
 * über die OpenAI-kompatible Chat-Completions-API. Auf Vercel meldet sich
 * JARVIS mit dem OIDC-Token der laufenden Funktion an – ein eigener
 * API-Schlüssel ist nicht nötig. Abgerechnet wird über das (monatlich
 * kostenlose) Guthaben des Vercel-Teams.
 */

export const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";

export const GATEWAY_MESSAGES = {
  missingToken:
    "Kein Zugang zum Vercel AI Gateway: Der OIDC-Token fehlt (gibt es nur auf Vercel) und AI_GATEWAY_API_KEY ist nicht gesetzt.",
  auth: "Das Vercel AI Gateway hat den Zugang abgelehnt. Bitte im Vercel-Dashboard unter „AI Gateway“ prüfen, ob es für das Team freigeschaltet ist.",
  verification:
    "Das Vercel AI Gateway ist noch nicht freigeschaltet: Für das kostenlose Guthaben verlangt Vercel einmalig eine im Team hinterlegte Kreditkarte (Vercel-Dashboard → AI Gateway).",
  quota: "Das KI-Guthaben des Vercel AI Gateway ist aufgebraucht – das kostenlose Kontingent erneuert sich monatlich.",
  model: "Das gewählte KI-Modell ist im Vercel AI Gateway nicht verfügbar. Bitte AI_GATEWAY_MODEL prüfen.",
} as const;

export interface GatewayProviderConfig {
  model: string;
  fallbackModels: string[];
  effortText?: GatewayEffort;
  effortVoice?: GatewayEffort;
  /** Nur für Tests. */
  baseUrl?: string;
  fetch?: typeof fetch;
}

/** Gateway-Fehler mit passenden Hinweisen versehen (Status bzw. Fehlertyp, nie Fehlertext). */
export function mapGatewayError(error: unknown): ProviderError {
  const mapped = mapOpenAIError(error);
  const options = { status: mapped.status, retryable: mapped.retryable, cause: error };
  if ((error as { type?: unknown } | null)?.type === "customer_verification_required") {
    return new ProviderError("not_configured", GATEWAY_MESSAGES.verification, options);
  }
  if (mapped.code === "quota") return new ProviderError("quota", GATEWAY_MESSAGES.quota, options);
  if (mapped.code === "auth") return new ProviderError("auth", GATEWAY_MESSAGES.auth, options);
  if (mapped.status === 404) return new ProviderError("bad_request", GATEWAY_MESSAGES.model, options);
  return mapped;
}

export function createGatewayProvider(config: GatewayProviderConfig): ChatProvider {
  return createOpenAIProvider({
    id: "gateway",
    label: "Vercel AI Gateway",
    baseUrl: config.baseUrl ?? AI_GATEWAY_BASE_URL,
    model: config.model,
    fallbackModels: config.fallbackModels,
    reasoningEffort: { text: config.effortText, voice: config.effortVoice },
    // Der Token wird pro Anfrage in der API-Route ermittelt (er wird regelmäßig erneuert).
    apiKey: (input: ProviderRunInput) => {
      const token = input.credentials?.gatewayToken;
      if (!token) throw new ProviderError("auth", GATEWAY_MESSAGES.missingToken);
      return token;
    },
    mapError: mapGatewayError,
    fetch: config.fetch,
  });
}
