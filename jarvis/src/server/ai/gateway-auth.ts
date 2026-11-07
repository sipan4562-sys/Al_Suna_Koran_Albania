import "server-only";
import { getEnv } from "@/server/config/env";

/**
 * Zugang zum Vercel AI Gateway ohne eigenen API-Schlüssel: Vercel gibt jeder
 * Funktion einen kurzlebigen OIDC-Token mit (Header `x-vercel-oidc-token`),
 * den das Gateway als Anmeldung akzeptiert. Der Token wird regelmäßig
 * erneuert – deshalb bei jeder Anfrage neu lesen, nie beim Start.
 */

const OIDC_HEADER = "x-vercel-oidc-token";
/** Anfragekontext der Vercel-Laufzeit (so liest ihn auch das offizielle Paket @vercel/oidc). */
const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

type HeaderValue = string | string[] | undefined;

interface RequestContextStore {
  get?: () => { headers?: Record<string, HeaderValue> } | undefined;
}

function clean(value: HeaderValue | null): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

function tokenFromVercelContext(): string | undefined {
  try {
    const store = (globalThis as Record<symbol, RequestContextStore | undefined>)[VERCEL_REQUEST_CONTEXT];
    return clean(store?.get?.()?.headers?.[OIDC_HEADER]);
  } catch {
    return undefined;
  }
}

/** Lokale Entwicklung: `vercel env pull` schreibt einen (12 h gültigen) Token in .env.local. */
export function localOidcToken(): string | undefined {
  return clean(process.env.VERCEL_OIDC_TOKEN);
}

/**
 * Reihenfolge: AI_GATEWAY_API_KEY → OIDC-Token der laufenden Vercel-Funktion
 * → VERCEL_OIDC_TOKEN (lokal). Ergebnis bleibt auf dem Server.
 */
export function resolveGatewayToken(headers?: Headers): string | undefined {
  return (
    getEnv().AI_GATEWAY_API_KEY ??
    clean(headers?.get(OIDC_HEADER) ?? null) ??
    tokenFromVercelContext() ??
    localOidcToken()
  );
}
