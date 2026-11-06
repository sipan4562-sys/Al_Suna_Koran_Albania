import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { MemoryDTO } from "@/lib/shared/types";
import { LIMITS } from "@/server/validation";
import { getDb } from "../client";
import { memories, type MemoryRow } from "../schema";

const toDTO = (row: MemoryRow): MemoryDTO => ({
  id: row.id,
  content: row.content,
  category: row.category,
  createdAt: new Date(row.createdAt).toISOString(),
});

const normalize = (value: string) => value.trim().replace(/\s+/g, " ");

/** LIKE-Sonderzeichen maskieren, damit Suchbegriffe wörtlich gelten. */
const likePattern = (query: string) => `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function listMemories(userId: string, limit = 200): Promise<MemoryDTO[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(desc(memories.createdAt))
    .limit(limit);
  return rows.map(toDTO);
}

export async function countMemories(userId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(memories)
    .where(eq(memories.userId, userId));
  return Number(row?.count ?? 0);
}

export type AddMemoryResult =
  | { status: "created"; memory: MemoryDTO }
  | { status: "duplicate"; memory: MemoryDTO }
  | { status: "full" };

export async function addMemory(
  userId: string,
  content: string,
  category = "general",
): Promise<AddMemoryResult> {
  const db = await getDb();
  const text = normalize(content).slice(0, LIMITS.memoryChars);

  const existing = await db
    .select()
    .from(memories)
    .where(and(eq(memories.userId, userId), sql`lower(${memories.content}) = lower(${text})`))
    .limit(1);
  if (existing[0]) return { status: "duplicate", memory: toDTO(existing[0]) };

  if ((await countMemories(userId)) >= LIMITS.maxMemories) return { status: "full" };

  const row: MemoryRow = {
    id: crypto.randomUUID(),
    userId,
    content: text,
    category: normalize(category).toLowerCase().slice(0, 30) || "general",
    createdAt: Date.now(),
  };
  await db.insert(memories).values(row);
  return { status: "created", memory: toDTO(row) };
}

export async function searchMemories(userId: string, query: string, limit = 20): Promise<MemoryDTO[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(memories)
    .where(
      and(eq(memories.userId, userId), sql`${memories.content} LIKE ${likePattern(normalize(query))} ESCAPE '\\'`),
    )
    .orderBy(desc(memories.createdAt))
    .limit(limit);
  return rows.map(toDTO);
}

export async function deleteMemory(userId: string, id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .delete(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)));
  return result.rowsAffected > 0;
}

export async function deleteMemoriesMatching(userId: string, query: string): Promise<MemoryDTO[]> {
  const matches = await searchMemories(userId, query, 50);
  if (matches.length === 0) return [];
  const db = await getDb();
  await db.delete(memories).where(
    and(
      eq(memories.userId, userId),
      inArray(
        memories.id,
        matches.map((m) => m.id),
      ),
    ),
  );
  return matches;
}

export async function deleteAllMemories(userId: string): Promise<number> {
  const db = await getDb();
  const result = await db.delete(memories).where(eq(memories.userId, userId));
  return result.rowsAffected;
}
