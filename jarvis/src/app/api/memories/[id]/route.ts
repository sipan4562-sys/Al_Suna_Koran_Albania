import { z } from "zod";
import { deleteMemory } from "@/server/db/repositories/memories";
import { api, jsonError } from "@/server/http/api";

interface Context {
  params: Promise<{ id: string }>;
}

/** DELETE /api/memories/:id */
export const DELETE = api<Context>(async (_request, { userId }, ctx) => {
  const { id } = await ctx.params;
  const ok = z.uuid().safeParse(id).success && (await deleteMemory(userId, id));
  if (!ok) return jsonError(404, "not_found", "Eintrag nicht gefunden.");
  return Response.json({ ok: true });
});
