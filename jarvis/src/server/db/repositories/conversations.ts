import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type {
  ChatMessageDTO,
  ChatRole,
  ConversationDTO,
  MessageMeta,
  MessageStatus,
} from "@/lib/shared/types";
import { getDb } from "../client";
import { conversations, messages, type ConversationRow, type MessageRow } from "../schema";

const iso = (ms: number) => new Date(ms).toISOString();

export function toMessageDTO(row: MessageRow): ChatMessageDTO {
  let meta: MessageMeta | null = null;
  if (row.meta) {
    try {
      meta = JSON.parse(row.meta) as MessageMeta;
    } catch {
      meta = null;
    }
  }
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    status: row.status,
    createdAt: iso(row.createdAt),
    meta,
  };
}

export async function listConversations(userId: string, limit = 100): Promise<ConversationDTO[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      // Bewusst voll qualifiziert: Drizzle rendert Spalten in der SELECT-Liste ohne
      // Tabellennamen – in der Unterabfrage würde "id" sonst auf messages.id zeigen.
      messageCount: sql<number>`(SELECT COUNT(*) FROM messages m WHERE m.conversation_id = "conversations"."id")`,
      preview: sql<string | null>`(SELECT substr(m.content, 1, 160) FROM messages m WHERE m.conversation_id = "conversations"."id" ORDER BY m.created_at DESC LIMIT 1)`,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    messageCount: Number(row.messageCount ?? 0),
    preview: row.preview ?? "",
  }));
}

export async function countConversations(userId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(conversations)
    .where(eq(conversations.userId, userId));
  return Number(row?.count ?? 0);
}

export async function getConversation(userId: string, id: string): Promise<ConversationRow | null> {
  const db = await getDb();
  const row = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, id), eq(conversations.userId, userId)),
  });
  return row ?? null;
}

export async function createConversation(
  userId: string,
  title: string,
  id: string = crypto.randomUUID(),
): Promise<ConversationRow> {
  const db = await getDb();
  const now = Date.now();
  const row: ConversationRow = { id, userId, title, createdAt: now, updatedAt: now };
  await db.insert(conversations).values(row);
  return row;
}

export async function renameConversation(userId: string, id: string, title: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .update(conversations)
    .set({ title })
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  return result.rowsAffected > 0;
}

export async function touchConversation(id: string, updatedAt = Date.now()): Promise<void> {
  const db = await getDb();
  await db.update(conversations).set({ updatedAt }).where(eq(conversations.id, id));
}

export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  const existing = await getConversation(userId, id);
  if (!existing) return false;
  const db = await getDb();
  await db.batch([
    db.delete(messages).where(eq(messages.conversationId, id)),
    db.delete(conversations).where(eq(conversations.id, id)),
  ]);
  return true;
}

export async function deleteAllConversations(userId: string): Promise<number> {
  const db = await getDb();
  const owned = db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.userId, userId));
  const count = await countConversations(userId);
  await db.batch([
    db.delete(messages).where(sql`${messages.conversationId} IN ${owned}`),
    db.delete(conversations).where(eq(conversations.userId, userId)),
  ]);
  return count;
}

export async function listMessages(conversationId: string, limit = 500): Promise<ChatMessageDTO[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
    .limit(limit);
  return rows.map(toMessageDTO);
}

/** Die jüngsten `limit` Nachrichten in chronologischer Reihenfolge. */
export async function recentMessages(conversationId: string, limit: number): Promise<MessageRow[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export interface NewMessage {
  id?: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  status?: MessageStatus;
  meta?: MessageMeta | null;
  createdAt?: number;
}

export async function insertMessage(input: NewMessage): Promise<MessageRow> {
  const db = await getDb();
  const row: MessageRow = {
    id: input.id ?? crypto.randomUUID(),
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    status: input.status ?? "complete",
    meta: input.meta ? JSON.stringify(input.meta) : null,
    createdAt: input.createdAt ?? Date.now(),
  };
  await db.insert(messages).values(row);
  return row;
}
