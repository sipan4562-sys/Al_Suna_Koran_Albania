import "server-only";
import type { ErrorCode } from "@/lib/shared/types";
import { ProviderError } from "./types";

/** Verständliche deutsche Fehlermeldungen für die Oberfläche. */
export const USER_MESSAGES: Record<ErrorCode, string> = {
  auth: "Der KI-Dienst hat den API-Schlüssel abgelehnt. Bitte prüfe die Konfiguration in .env.local.",
  rate_limit: "Der KI-Dienst ist gerade ausgelastet (Rate-Limit). Bitte versuche es in einem Moment erneut.",
  overloaded: "Der KI-Dienst ist momentan überlastet. Bitte versuche es gleich noch einmal.",
  network: "Keine Verbindung zum KI-Dienst. Bitte prüfe die Internetverbindung des Servers.",
  bad_request: "Die Anfrage wurde vom KI-Dienst abgelehnt. Prüfe Modellname und Konfiguration.",
  refusal: "Bei dieser Anfrage kann ich leider nicht helfen.",
  not_configured: "Es ist kein KI-Anbieter konfiguriert.",
  timeout: "Der KI-Dienst hat nicht rechtzeitig geantwortet. Bitte versuche es erneut.",
  aborted: "Die Anfrage wurde abgebrochen.",
  internal: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.",
};

interface StatusLikeError {
  status?: unknown;
  name?: unknown;
}

/**
 * Fallback-Abbildung für Fehler von SDKs, deren Klassen hier nicht direkt
 * geprüft werden: nur anhand des HTTP-Status, niemals anhand des Textes.
 */
export function fromHttpStatus(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const status = Number((error as StatusLikeError | null)?.status);
  if (status === 401 || status === 403) {
    return new ProviderError("auth", USER_MESSAGES.auth, { status, cause: error });
  }
  if (status === 429) {
    return new ProviderError("rate_limit", USER_MESSAGES.rate_limit, { status, retryable: true, cause: error });
  }
  if (status === 408 || status === 504) {
    return new ProviderError("timeout", USER_MESSAGES.timeout, { status, retryable: true, cause: error });
  }
  if (status === 529 || status === 503) {
    return new ProviderError("overloaded", USER_MESSAGES.overloaded, { status, retryable: true, cause: error });
  }
  if (status >= 500) {
    return new ProviderError("internal", USER_MESSAGES.internal, { status, retryable: true, cause: error });
  }
  if (status >= 400) {
    return new ProviderError("bad_request", USER_MESSAGES.bad_request, { status, cause: error });
  }
  return new ProviderError("internal", USER_MESSAGES.internal, { retryable: true, cause: error });
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof ProviderError) return error.code === "aborted";
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return (error as StatusLikeError | null)?.name === "AbortError";
}
