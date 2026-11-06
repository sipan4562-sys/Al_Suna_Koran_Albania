import { connection } from "next/server";
import { addMemory, deleteAllMemories, listMemories } from "@/server/db/repositories/memories";
import { api, jsonError, payloadErrorResponse, readJson } from "@/server/http/api";
import { CreateMemorySchema, firstIssue } from "@/server/validation";

/** GET /api/memories – gespeicherte Fakten des persönlichen Gedächtnisses. */
export const GET = api(async (_request, { userId }) => {
  await connection();
  return Response.json({ memories: await listMemories(userId, 500) });
});

/** POST /api/memories – Fakt manuell hinzufügen. */
export const POST = api(
  async (request, { userId }) => {
    let body: unknown;
    try {
      body = await readJson(request);
    } catch (error) {
      return payloadErrorResponse(error) ?? jsonError(400, "bad_request", "Ungültige Anfrage.");
    }
    const parsed = CreateMemorySchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request", firstIssue(parsed.error));
    const result = await addMemory(userId, parsed.data.content, parsed.data.category);
    if (result.status === "full") return jsonError(409, "full", "Das Gedächtnis ist voll.");
    return Response.json({ memory: result.memory, status: result.status });
  },
  { rateLimit: { bucket: "memories", limit: 60 } },
);

/** DELETE /api/memories – gesamtes Gedächtnis löschen. */
export const DELETE = api(async (_request, { userId }) => {
  return Response.json({ deleted: await deleteAllMemories(userId) });
});
