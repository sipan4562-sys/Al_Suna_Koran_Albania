import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { getEnv } from "@/server/config/env";
import { MIGRATIONS } from "./migrations";
import * as schema from "./schema";

export type Database = LibSQLDatabase<typeof schema>;

export interface StorageInfo {
  url: string;
  driver: "file" | "remote" | "memory";
  persistent: boolean;
}

interface DbState {
  client: Client;
  db: Database;
  info: StorageInfo;
  ready: Promise<void>;
}

const globalForDb = globalThis as unknown as { __jarvisDb?: DbState };

export function resolveStorage(): StorageInfo {
  const env = getEnv();
  const configured = env.DATABASE_URL;

  if (configured === ":memory:" || configured === "file::memory:") {
    return { url: ":memory:", driver: "memory", persistent: false };
  }
  if (configured && !configured.startsWith("file:")) {
    return { url: configured, driver: "remote", persistent: true };
  }
  if (configured) {
    // Auf Vercel ist nur /tmp beschreibbar – und nicht dauerhaft.
    const persistent = !(env.VERCEL && configured.includes("/tmp/"));
    return { url: configured, driver: "file", persistent };
  }
  if (env.VERCEL) {
    return { url: "file:/tmp/jarvis.db", driver: "file", persistent: false };
  }
  return { url: "file:./data/jarvis.db", driver: "file", persistent: true };
}

function ensureDirectory(fileUrl: string) {
  const filePath = fileUrl.replace(/^file:/, "");
  if (!filePath || filePath === ":memory:") return;
  // Laufzeitpfad der Datenbank – nicht in das Build-Tracing aufnehmen.
  const dir = path.dirname(path.resolve(/*turbopackIgnore: true*/ process.cwd(), filePath));
  fs.mkdirSync(dir, { recursive: true });
}

export async function runMigrations(client: Client): Promise<void> {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )`,
  );
  const result = await client.execute("SELECT id FROM _migrations");
  const applied = new Set(result.rows.map((row) => Number(row.id)));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    await client.batch(
      [
        ...migration.statements,
        {
          sql: "INSERT OR IGNORE INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)",
          args: [migration.id, migration.name, Date.now()],
        },
      ],
      "write",
    );
  }
}

function createState(): DbState {
  const info = resolveStorage();
  if (info.driver === "file") ensureDirectory(info.url);

  const client = createClient({
    url: info.url,
    authToken: info.driver === "remote" ? getEnv().DATABASE_AUTH_TOKEN : undefined,
  });
  const db = drizzle(client, { schema });

  const ready = (async () => {
    if (info.driver === "file") {
      // WAL erlaubt parallele Leser während geschrieben wird.
      await client.execute("PRAGMA journal_mode = WAL").catch(() => undefined);
      await client.execute("PRAGMA busy_timeout = 5000").catch(() => undefined);
    }
    await runMigrations(client);
    if (!info.persistent) {
      console.warn(
        `[jarvis] Datenbank "${info.url}" ist nicht dauerhaft – Chatverläufe gehen bei Neustarts verloren. ` +
          "Setze DATABASE_URL auf eine Turso/libSQL-Datenbank.",
      );
    }
  })();

  // Fehlgeschlagene Initialisierung beim nächsten Zugriff erneut versuchen.
  ready.catch(() => {
    if (globalForDb.__jarvisDb?.ready === ready) globalForDb.__jarvisDb = undefined;
  });

  return { client, db, info, ready };
}

function getState(): DbState {
  if (!globalForDb.__jarvisDb) globalForDb.__jarvisDb = createState();
  return globalForDb.__jarvisDb;
}

/** Liefert die migrierte Datenbank-Instanz. */
export async function getDb(): Promise<Database> {
  const state = getState();
  await state.ready;
  return state.db;
}

export function getStorageInfo(): StorageInfo {
  return getState().info;
}

/** Nur für Tests: Verbindung schließen und Singleton zurücksetzen. */
export function resetDbForTests(): void {
  const state = globalForDb.__jarvisDb;
  if (state) state.client.close();
  globalForDb.__jarvisDb = undefined;
}
