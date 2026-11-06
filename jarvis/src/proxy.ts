import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, SESSION_COOKIE, verifySessionToken } from "@/server/auth/session";

/**
 * Zugangsschutz (optimistische Prüfung). Ist JARVIS_ACCESS_CODE gesetzt,
 * werden Seiten ohne gültige Sitzung auf /login umgeleitet und API-Aufrufe
 * mit 401 beantwortet. Jede API-Route prüft die Sitzung zusätzlich selbst.
 */

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/logout", "/api/health"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const toHome = () => NextResponse.redirect(new URL("/", request.url));

  if (!authEnabled()) return pathname === "/login" ? toHome() : NextResponse.next();

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (pathname === "/login" && session) return toHome();
  if (PUBLIC_PATHS.has(pathname) || session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return Response.json(
      { error: { code: "unauthorized", message: "Bitte melde dich an." } },
      { status: 401 },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Statische Dateien, Icons und das Manifest bleiben öffentlich.
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|icons/|robots.txt).*)",
  ],
};
