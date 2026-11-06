import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Datenmodell. Alle Daten hängen an einem Benutzer, damit später echte
 * Benutzerprofile / Mehrbenutzerbetrieb ohne Schema-Bruch möglich sind.
 * Änderungen hier IMMER zusammen mit einer neuen Migration in
 * `migrations.ts` vornehmen.
 */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  /** JSON-serialisierte ProfileSettings */
  settings: text("settings").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("conversations_user_updated_idx").on(table.userId, table.updatedAt)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull(),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    status: text("status", { enum: ["complete", "partial", "error"] })
      .notNull()
      .default("complete"),
    /** JSON-serialisierte MessageMeta */
    meta: text("meta"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("messages_conversation_created_idx").on(table.conversationId, table.createdAt)],
);

export const memories = sqliteTable(
  "memories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    category: text("category").notNull().default("general"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("memories_user_created_idx").on(table.userId, table.createdAt)],
);

export type UserRow = typeof users.$inferSelect;
export type ConversationRow = typeof conversations.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type MemoryRow = typeof memories.$inferSelect;
