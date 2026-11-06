import { connection } from "next/server";
import { getProfile, updateProfile } from "@/server/db/repositories/users";
import { api, jsonError, payloadErrorResponse, readJson } from "@/server/http/api";
import { firstIssue, ProfilePatchSchema } from "@/server/validation";

/** GET /api/profile – Benutzerprofil (Name, Anrede, Persönlichkeit …). */
export const GET = api(async (_request, { userId }) => {
  await connection();
  return Response.json({ profile: await getProfile(userId) });
});

/** PUT /api/profile – Teilaktualisierung des Profils. */
export const PUT = api(
  async (request, { userId }) => {
    let body: unknown;
    try {
      body = await readJson(request);
    } catch (error) {
      return payloadErrorResponse(error) ?? jsonError(400, "bad_request", "Ungültige Anfrage.");
    }
    const parsed = ProfilePatchSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request", firstIssue(parsed.error));
    return Response.json({ profile: await updateProfile(userId, parsed.data) });
  },
  { rateLimit: { bucket: "profile", limit: 60 } },
);
