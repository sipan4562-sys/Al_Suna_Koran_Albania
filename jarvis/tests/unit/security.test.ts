import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authEnabled,
  createSessionToken,
  SESSION_TTL_MS,
  sessionFromCookieHeader,
  timingSafeEqual,
  verifyAccessCode,
  verifySessionToken,
} from "@/server/auth/session";
import { resetEnvCache } from "@/server/config/env";
import { isSameOrigin } from "@/server/http/api";
import { isSecureRequest, safeNextPath } from "@/server/http/request";
import { clientIp, rateLimit, resetRateLimits } from "@/server/security/rate-limit";
import { setupTestEnvironment } from "../support/test-env";

let cleanup: () => void;
beforeAll(() => {
  cleanup = setupTestEnvironment({ JARVIS_ACCESS_CODE: "geheim-123", JARVIS_SESSION_SECRET: "x".repeat(48) });
});
afterAll(() => cleanup());

describe("Sitzungen", () => {
  it("erstellt und prüft signierte Tokens", async () => {
    expect(authEnabled()).toBe(true);
    const token = await createSessionToken("default");
    expect(await verifySessionToken(token)).toMatchObject({ userId: "default" });
    expect(await sessionFromCookieHeader(`foo=1; jarvis_session=${encodeURIComponent(token)}`)).not.toBeNull();
  });

  it("lehnt manipulierte, abgelaufene und fremde Tokens ab", async () => {
    const token = await createSessionToken("default");
    const [v, user, exp, sig] = token.split(".");
    expect(await verifySessionToken(`${v}.admin.${exp}.${sig}`)).toBeNull();
    expect(await verifySessionToken(`${v}.${user}.${Number(exp) + 1}.${sig}`)).toBeNull();
    expect(await verifySessionToken(token, Date.now() + SESSION_TTL_MS + 1000)).toBeNull();
    expect(await verifySessionToken("v1.default.123")).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();

    // Anderes Secret → altes Token ungültig.
    process.env.JARVIS_SESSION_SECRET = "y".repeat(48);
    resetEnvCache();
    expect(await verifySessionToken(token)).toBeNull();
    process.env.JARVIS_SESSION_SECRET = "x".repeat(48);
    resetEnvCache();
  });

  it("prüft den Zugangscode", async () => {
    expect(await verifyAccessCode("geheim-123")).toBe(true);
    expect(await verifyAccessCode("geheim-12")).toBe(false);
    expect(await verifyAccessCode("")).toBe(false);
  });

  it("vergleicht in konstanter Zeit korrekt", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});

describe("Anfrageprüfung", () => {
  it("verhindert offene Weiterleitungen", () => {
    expect(safeNextPath("/?view=chat")).toBe("/?view=chat");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });

  it("erkennt Cross-Origin-Anfragen", () => {
    const req = (origin?: string) =>
      new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { host: "localhost:3000", ...(origin ? { origin } : {}) },
      });
    expect(isSameOrigin(req("http://localhost:3000"))).toBe(true);
    expect(isSameOrigin(req())).toBe(true);
    expect(isSameOrigin(req("https://evil.example"))).toBe(false);
  });

  it("erkennt HTTPS hinter einem Proxy", () => {
    const req = new Request("http://internal/api", { headers: { "x-forwarded-proto": "https" } });
    expect(isSecureRequest(req)).toBe(true);
    expect(isSecureRequest(new Request("http://internal/api"))).toBe(false);
  });
});

describe("Rate-Limit", () => {
  it("begrenzt Anfragen pro Zeitfenster", () => {
    resetRateLimits();
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("t", 3, 60_000, now + i).allowed).toBe(true);
    const blocked = rateLimit("t", 3, 60_000, now + 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(rateLimit("t", 3, 60_000, now + 60_001).allowed).toBe(true);
    expect(rateLimit("anderer-key", 3, 60_000, now + 10).allowed).toBe(true);
  });

  it("liest die Client-IP aus Proxy-Headern", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("local");
  });
});
