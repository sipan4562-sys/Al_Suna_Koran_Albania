import { connection } from "next/server";
import { deleteAllConversations, listConversations } from "@/server/db/repositories/conversations";
import { api } from "@/server/http/api";

/** GET /api/conversations – alle Unterhaltungen, neueste zuerst. */
export const GET = api(async (_request, { userId }) => {
  await connection();
  return Response.json({ conversations: await listConversations(userId) });
});

/** DELETE /api/conversations – gesamten Verlauf löschen. */
export const DELETE = api(async (_request, { userId }) => {
  return Response.json({ deleted: await deleteAllConversations(userId) });
});
