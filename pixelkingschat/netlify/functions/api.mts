import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

// Der Server sieht NIE Klartext: Nachrichten kommen bereits Ende-zu-Ende-verschlüsselt
// (ECDH P-256 + AES-GCM im Browser) an und werden nur kurz zwischengespeichert,
// bis der Empfänger sie abholt – höchstens 24 Stunden.

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CT = 16_000; // max. Länge des verschlüsselten Textes (Base64)
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne 0/O/1/I
const ID_RE = /^[A-HJ-NP-Z2-9]{8}$/;

const users = () => getStore({ name: "pk-users", consistency: "strong" });
const inbox = () => getStore({ name: "pk-inbox", consistency: "strong" });

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const err = (msg: string, status = 400) => json({ error: msg }, status);

function randomId(len = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let s = "";
  for (const b of bytes) s += ID_ALPHABET[b % ID_ALPHABET.length];
  return s;
}

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type User = { pub: string; th: string; created: number };

async function auth(req: Request): Promise<string | null> {
  const h = req.headers.get("authorization") || "";
  const m = /^PK ([A-HJ-NP-Z2-9]{8}):([A-Za-z0-9_-]{32,64})$/.exec(h);
  if (!m) return null;
  const [, id, token] = m;
  const u = (await users().get(id, { type: "json" })) as User | null;
  if (!u) return null;
  return u.th === (await sha256Hex(token)) ? id : null;
}

function validPub(pub: unknown): pub is string {
  return typeof pub === "string" && /^[A-Za-z0-9_-]{80,100}$/.test(pub);
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "");
  const method = req.method;

  try {
    // Neues anonymes Konto: nur ein öffentlicher Schlüssel, keine Nummer, keine Mail.
    if (route === "register" && method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body || !validPub(body.pub) || typeof body.token !== "string" || !/^[A-Za-z0-9_-]{32,64}$/.test(body.token))
        return err("Ungültige Daten");
      const th = await sha256Hex(body.token);
      for (let i = 0; i < 6; i++) {
        const id = randomId();
        const { modified } = await users().setJSON(id, { pub: body.pub, th, created: Date.now() } satisfies User, {
          onlyIfNew: true,
        });
        if (modified) return json({ id });
      }
      return err("Bitte nochmal versuchen", 503);
    }

    // Öffentlichen Schlüssel eines Codes abrufen
    if (route.startsWith("key/") && method === "GET") {
      const id = route.slice(4).toUpperCase();
      if (!ID_RE.test(id)) return err("Ungültiger Code");
      const u = (await users().get(id, { type: "json" })) as User | null;
      if (!u) return err("Code nicht gefunden", 404);
      return json({ id, pub: u.pub });
    }

    const me = await auth(req);
    if (!me) return err("Nicht angemeldet", 401);

    // Verschlüsselte Nachricht senden
    if (route === "send" && method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body || typeof body.to !== "string" || !ID_RE.test(body.to)) return err("Ungültiger Empfänger");
      if (typeof body.iv !== "string" || !/^[A-Za-z0-9_-]{16}$/.test(body.iv)) return err("Ungültige Daten");
      if (typeof body.ct !== "string" || !/^[A-Za-z0-9_-]+$/.test(body.ct) || body.ct.length > MAX_CT)
        return err("Nachricht zu lang");
      if (typeof body.mid !== "string" || !/^[A-Za-z0-9_-]{8,32}$/.test(body.mid)) return err("Ungültige Daten");
      const target = await users().get(body.to, { type: "json" });
      if (!target) return err("Empfänger existiert nicht", 404);
      const ts = Date.now();
      const key = `${body.to}/${ts}-${body.mid}`;
      await inbox().setJSON(key, { from: me, iv: body.iv, ct: body.ct, mid: body.mid, ts });
      return json({ ok: true, ts });
    }

    // Eigene Nachrichten abholen
    if (route === "inbox" && method === "GET") {
      const store = inbox();
      const { blobs } = await store.list({ prefix: `${me}/` });
      const now = Date.now();
      const out: unknown[] = [];
      for (const b of blobs.slice(0, 100)) {
        const ts = Number(b.key.slice(me.length + 1).split("-")[0]);
        if (!ts || now - ts > TTL_MS) {
          await store.delete(b.key);
          continue;
        }
        const m = await store.get(b.key, { type: "json" });
        if (m) out.push({ ...m, key: b.key });
      }
      return json({ messages: out });
    }

    // Empfang bestätigen → Nachricht wird sofort vom Server gelöscht
    if (route === "ack" && method === "POST") {
      const body = await req.json().catch(() => null);
      const keys: unknown = body?.keys;
      if (!Array.isArray(keys)) return err("Ungültige Daten");
      const store = inbox();
      for (const k of keys.slice(0, 100)) {
        if (typeof k === "string" && k.startsWith(`${me}/`)) await store.delete(k);
      }
      return json({ ok: true });
    }

    // Konto + alle wartenden Nachrichten löschen
    if (route === "me" && method === "DELETE") {
      const store = inbox();
      const { blobs } = await store.list({ prefix: `${me}/` });
      for (const b of blobs) await store.delete(b.key);
      await users().delete(me);
      return json({ ok: true });
    }

    return err("Nicht gefunden", 404);
  } catch (e) {
    console.error("api error", route, e);
    return err("Serverfehler", 500);
  }
};

export const config: Config = {
  path: "/api/*",
  rateLimit: {
    windowLimit: 240,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
