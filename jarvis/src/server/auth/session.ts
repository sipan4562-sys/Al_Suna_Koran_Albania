import "server-only";
import { getEnv } from "@/server/config/env";

/**
 * Schlanke, zustandslose Sitzungen: `v1.<userId>.<ablaufMs>.<HMAC-SHA256>`
 * im HttpOnly-Cookie. Nutzt Web Crypto und funktioniert damit im Proxy und
 * in Route Handlern gleichermaßen.
 */

export const SESSION_COOKIE = "jarvis_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_USER = "default";

const encoder = new TextEncoder();

export function authEnabled(): boolean {
  return Boolean(getEnv().JARVIS_ACCESS_CODE);
}

function base64url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let keyPromise: { secret: string; key: Promise<CryptoKey> } | null = null;

function signingSecret(): string {
  const env = getEnv();
  // Ohne explizites Secret wird es aus dem Zugangscode abgeleitet: Ändert sich
  // der Code, werden alle bestehenden Sitzungen ungültig.
  return env.JARVIS_SESSION_SECRET ?? `jarvis-session:${env.JARVIS_ACCESS_CODE ?? ""}`;
}

function hmacKey(): Promise<CryptoKey> {
  const secret = signingSecret();
  if (!keyPromise || keyPromise.secret !== secret) {
    keyPromise = {
      secret,
      key: crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
        "sign",
      ]),
    };
  }
  return keyPromise.key;
}

async function sign(payload: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload));
  return base64url(signature);
}

/** Vergleich in konstanter Zeit (bezogen auf die Länge der Eingaben). */
export function timingSafeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function createSessionToken(userId = DEFAULT_USER, now = Date.now()): Promise<string> {
  const payload = `v1.${userId}.${now + SESSION_TTL_MS}`;
  return `${payload}.${await sign(payload)}`;
}

export interface Session {
  userId: string;
  expiresAt: number;
}

export async function verifySessionToken(token: string | undefined | null, now = Date.now()): Promise<Session | null> {
  if (!token || token.length > 300) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [version, userId, expires, signature] = parts;
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(userId)) return null;
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return null;
  const expected = await sign(`${version}.${userId}.${expires}`);
  return timingSafeEqual(signature, expected) ? { userId, expiresAt } : null;
}

export async function verifyAccessCode(code: string): Promise<boolean> {
  const expected = getEnv().JARVIS_ACCESS_CODE;
  if (!expected) return false;
  // Hashes vergleichen, damit auch die Länge des Codes nicht durchsickert.
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(code)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return timingSafeEqual(base64url(a), base64url(b));
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

/** Liest und prüft das Sitzungs-Cookie aus einem Request-Header. */
export async function sessionFromCookieHeader(cookieHeader: string | null): Promise<Session | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  return verifySessionToken(decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)));
}
