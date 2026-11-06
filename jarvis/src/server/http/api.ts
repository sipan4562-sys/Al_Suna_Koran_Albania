import "server-only";
import { authEnabled, sessionFromCookieHeader } from "@/server/auth/session";
import { DEFAULT_USER_ID } from "@/server/db/repositories/users";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

export interface ApiContext {
  userId: string;
}

export function jsonError(status: number, code: string, message: string, headers?: HeadersInit): Response {
  return Response.json({ error: { code, message } }, { status, headers });
}

/** Schutz vor Cross-Site-Requests für schreibende Methoden (zusätzlich zu SameSite-Cookies). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Nicht-Browser-Clients senden keinen Origin-Header.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

interface ApiOptions {
  /** Rate-Limit-Bucket und Anfragen pro Minute. */
  rateLimit?: { bucket: string; limit: number };
  /** Ohne Anmeldung erreichbar (z. B. Login). */
  public?: boolean;
}

type Handler<C> = (request: Request, context: ApiContext, routeContext: C) => Promise<Response>;

/**
 * Gemeinsamer Rahmen aller API-Routen: Authentifizierung (zusätzlich zum
 * Proxy – "Defense in Depth"), Same-Origin-Prüfung, Rate-Limit und
 * einheitliche Fehlerantworten ohne interne Details.
 */
export function api<C = unknown>(handler: Handler<C>, options: ApiOptions = {}) {
  return async (request: Request, routeContext: C): Promise<Response> => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD" && !isSameOrigin(request)) {
        return jsonError(403, "forbidden", "Ungültiger Ursprung der Anfrage.");
      }

      let userId = DEFAULT_USER_ID;
      if (!options.public && authEnabled()) {
        const session = await sessionFromCookieHeader(request.headers.get("cookie"));
        if (!session) return jsonError(401, "unauthorized", "Bitte melde dich an.");
        userId = session.userId;
      }

      if (options.rateLimit) {
        const result = rateLimit(
          `${options.rateLimit.bucket}:${clientIp(request.headers)}`,
          options.rateLimit.limit,
        );
        if (!result.allowed) {
          return jsonError(429, "rate_limited", "Zu viele Anfragen – bitte kurz warten.", {
            "Retry-After": String(result.retryAfterSeconds),
          });
        }
      }

      return await handler(request, { userId }, routeContext);
    } catch (error) {
      console.error(`[jarvis] API-Fehler ${request.method} ${new URL(request.url).pathname}:`, error);
      return jsonError(500, "internal", "Interner Serverfehler.");
    }
  };
}

/** JSON-Body sicher lesen (mit Größenlimit). */
export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new PayloadError("Anfrage ist zu groß.");
  const text = await request.text();
  if (text.length > maxBytes) throw new PayloadError("Anfrage ist zu groß.");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new PayloadError("Ungültiges JSON.");
  }
}

export class PayloadError extends Error {}

export function payloadErrorResponse(error: unknown): Response | null {
  return error instanceof PayloadError ? jsonError(400, "bad_request", error.message) : null;
}
