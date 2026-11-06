import { NextResponse } from "next/server";
import {
  authEnabled,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyAccessCode,
} from "@/server/auth/session";
import { api, jsonError, payloadErrorResponse, readJson } from "@/server/http/api";
import { isSecureRequest, safeNextPath } from "@/server/http/request";
import { LoginSchema } from "@/server/validation";

/** POST /api/auth/login – Zugangscode prüfen und Sitzungs-Cookie setzen. */
export const POST = api(
  async (request) => {
    if (!authEnabled()) return Response.json({ ok: true, next: "/" });

    let body: unknown;
    try {
      body = await readJson(request, 4 * 1024);
    } catch (error) {
      return payloadErrorResponse(error) ?? jsonError(400, "bad_request", "Ungültige Anfrage.");
    }
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success || !(await verifyAccessCode(parsed.data.code))) {
      // Kleine Verzögerung bremst automatisiertes Durchprobieren zusätzlich.
      await new Promise((resolve) => setTimeout(resolve, 400));
      return jsonError(401, "invalid_code", "Der Zugangscode ist nicht korrekt.");
    }

    const response = NextResponse.json({ ok: true, next: safeNextPath(parsed.data.next) });
    response.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions(isSecureRequest(request)));
    return response;
  },
  { public: true, rateLimit: { bucket: "login", limit: 8 } },
);
