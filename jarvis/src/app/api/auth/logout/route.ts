import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/session";
import { api } from "@/server/http/api";

/** POST /api/auth/logout – Sitzungs-Cookie entfernen. */
export const POST = api(
  async () => {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  },
  { public: true },
);
