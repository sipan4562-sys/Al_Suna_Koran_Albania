import { connection } from "next/server";
import { z } from "zod";
import {
  deleteConversation,
  getConversation,
  listMessages,
  renameConversation,
} from "@/server/db/repositories/conversations";
import { api, jsonError, payloadErrorResponse, readJson } from "@/server/http/api";
import { firstIssue, RenameConversationSchema } from "@/server/validation";

interface Context {
  params: Promise<{ id: string }>;
}

const Id = z.uuid();

async function conversationId(ctx: Context): Promise<string | null> {
  const { id } = await ctx.params;
  return Id.safeParse(id).success ? id : null;
}

/** GET /api/conversations/:id – Unterhaltung samt Nachrichten. */
export const GET = api<Context>(async (_request, { userId }, ctx) => {
  await connection();
  const id = await conversationId(ctx);
  const conversation = id ? await getConversation(userId, id) : null;
  if (!conversation) return jsonError(404, "not_found", "Unterhaltung nicht gefunden.");
  return Response.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: new Date(conversation.createdAt).toISOString(),
      updatedAt: new Date(conversation.updatedAt).toISOString(),
    },
    messages: await listMessages(conversation.id),
  });
});

/** PATCH /api/conversations/:id – umbenennen. */
export const PATCH = api<Context>(async (request, { userId }, ctx) => {
  const id = await conversationId(ctx);
  if (!id) return jsonError(404, "not_found", "Unterhaltung nicht gefunden.");
  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    return payloadErrorResponse(error) ?? jsonError(400, "bad_request", "Ungültige Anfrage.");
  }
  const parsed = RenameConversationSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "bad_request", firstIssue(parsed.error));
  const ok = await renameConversation(userId, id, parsed.data.title);
  if (!ok) return jsonError(404, "not_found", "Unterhaltung nicht gefunden.");
  return Response.json({ ok: true, title: parsed.data.title });
});

/** DELETE /api/conversations/:id */
export const DELETE = api<Context>(async (_request, { userId }, ctx) => {
  const id = await conversationId(ctx);
  const ok = id ? await deleteConversation(userId, id) : false;
  if (!ok) return jsonError(404, "not_found", "Unterhaltung nicht gefunden.");
  return Response.json({ ok: true });
});
