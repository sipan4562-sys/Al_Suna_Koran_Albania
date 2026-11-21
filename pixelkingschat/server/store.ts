// Speicher-Adapter: dieselbe kleine Schnittstelle wie Netlify Blobs –
// auf Netlify echte Netlify Blobs, auf Vercel eine Postgres-Datenbank (z. B. Supabase).
import { getStore as getNetlifyStore } from "@netlify/blobs";
import postgres from "postgres";

type GetType = "text" | "json" | "arrayBuffer";
type ListResult = { blobs: { key: string; etag?: string }[]; directories?: string[] };
type SetOpts = { onlyIfNew?: boolean; metadata?: Record<string, unknown> };
export interface Store {
  get(key: string, opts?: { type?: GetType; consistency?: string }): Promise<any>;
  set(key: string, value: string | ArrayBuffer, opts?: SetOpts): Promise<{ modified: boolean }>;
  setJSON(key: string, value: unknown, opts?: SetOpts): Promise<{ modified: boolean }>;
  delete(key: string): Promise<void>;
  list(opts?: { prefix?: string; paginate?: false }): Promise<ListResult>;
  list(opts: { prefix?: string; paginate: true }): AsyncIterable<ListResult>;
}

export const env = (k: string): string | undefined => process.env[k] || undefined;
const DB_URL = () => env("POSTGRES_URL") || env("DATABASE_URL") || env("SUPABASE_DB_URL");
export const usingPostgres = () => !!DB_URL();

// Lebensdauer pro Speicher (ms) – abgelaufene Einträge verschwinden automatisch
const H = 3600_000;
const TTL: Record<string, number> = {
  "pk-inbox": 25 * H,
  "pk-franks": 26 * H,
  "pk-gbody": 26 * H,
  "pk-signal": 15 * 60_000,
  "pk-media": 26 * H,
  "pk-stories": 25 * H,
  "pk-storyviews": 25 * H,
  "pk-pubidx": 25 * H,
  "pk-presence": 48 * H,
  "pk-meetmembers": 24 * H,
  "pk-meetings": 25 * H,
};

let sql: ReturnType<typeof postgres> | null = null;
let ready: Promise<void> | null = null;
function db() {
  if (!sql) {
    sql = postgres(DB_URL()!, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 15, ssl: "require", onnotice: () => {} });
  }
  ready ??= (async () => {
    await sql!`create table if not exists pk_kv (
      store text not null,
      key text not null,
      val bytea,
      json jsonb,
      meta jsonb,
      expires_at timestamptz,
      updated_at timestamptz not null default now(),
      primary key (store, key)
    )`;
    await sql!`create index if not exists pk_kv_prefix on pk_kv (store, key text_pattern_ops)`;
    await sql!`create index if not exists pk_kv_exp on pk_kv (expires_at) where expires_at is not null`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready.then(() => sql!);
}

let opCount = 0;
async function maybeSweep(s: ReturnType<typeof postgres>) {
  if (++opCount % 200 !== 0) return;
  await s`delete from pk_kv where expires_at is not null and expires_at < now()`.catch(() => {});
}
export async function sweepExpired() {
  if (!usingPostgres()) return 0;
  const s = await db();
  const r = await s`delete from pk_kv where expires_at is not null and expires_at < now()`;
  return r.count;
}

const likeEscape = (p: string) => p.replace(/[\\%_]/g, (m) => "\\" + m);

function pgStore(name: string): Store {
  const ttl = TTL[name];
  const exp = () => (ttl ? new Date(Date.now() + ttl) : null);
  const write = async (key: string, val: Buffer | null, json: unknown, opts: SetOpts = {}) => {
    const s = await db();
    maybeSweep(s);
    const meta = opts.metadata ? s.json(opts.metadata as any) : null;
    const j = json === undefined ? null : s.json(json as any);
    if (opts.onlyIfNew) {
      const r = await s`
        insert into pk_kv (store, key, val, json, meta, expires_at)
        values (${name}, ${key}, ${val}, ${j}, ${meta}, ${exp()})
        on conflict (store, key) do update set val = excluded.val, json = excluded.json, meta = excluded.meta,
          expires_at = excluded.expires_at, updated_at = now()
        where pk_kv.expires_at is not null and pk_kv.expires_at < now()
        returning key`;
      return { modified: r.length > 0 };
    }
    await s`
      insert into pk_kv (store, key, val, json, meta, expires_at)
      values (${name}, ${key}, ${val}, ${j}, ${meta}, ${exp()})
      on conflict (store, key) do update set val = excluded.val, json = excluded.json, meta = excluded.meta,
        expires_at = excluded.expires_at, updated_at = now()`;
    return { modified: true };
  };
  return {
    async get(key, opts = {}) {
      const s = await db();
      const rows = await s`select val, json from pk_kv where store = ${name} and key = ${key}
        and (expires_at is null or expires_at > now())`;
      if (!rows.length) return null;
      const { val, json } = rows[0] as { val: Buffer | null; json: unknown };
      const type = opts.type || "text";
      if (type === "json") return json ?? (val ? JSON.parse(Buffer.from(val).toString("utf8")) : null);
      if (type === "arrayBuffer") {
        const b = val ? Buffer.from(val) : Buffer.from(JSON.stringify(json));
        return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
      }
      return val ? Buffer.from(val).toString("utf8") : json === null || json === undefined ? null : JSON.stringify(json);
    },
    async set(key, value, opts) {
      const buf = typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(new Uint8Array(value));
      return write(key, buf, undefined, opts);
    },
    async setJSON(key, value, opts) {
      return write(key, null, value, opts);
    },
    async delete(key) {
      const s = await db();
      await s`delete from pk_kv where store = ${name} and key = ${key}`;
    },
    list(opts: { prefix?: string; paginate?: boolean } = {}): any {
      const run = async () => {
        const s = await db();
        const rows = opts.prefix
          ? await s`select key from pk_kv where store = ${name} and key like ${likeEscape(opts.prefix) + "%"}
              and (expires_at is null or expires_at > now()) order by key`
          : await s`select key from pk_kv where store = ${name} and (expires_at is null or expires_at > now()) order by key`;
        return { blobs: rows.map((r: any) => ({ key: r.key as string, etag: "" })), directories: [] as string[] };
      };
      if (opts.paginate) {
        return (async function* () {
          yield await run();
        })();
      }
      return run();
    },
  };
}

export function getStore(opts: { name: string; consistency?: "strong" | "eventual" }): Store {
  if (usingPostgres()) return pgStore(opts.name);
  return getNetlifyStore(opts as any) as unknown as Store;
}
