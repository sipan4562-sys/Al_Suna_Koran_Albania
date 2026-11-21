// Aufruf: node scripts/loadtest.mjs https://pixelkingschat.vercel.app 100 90   (URL, Personen, Sekunden)
// Lasttest: N Nutzer gleichzeitig – registrieren, alle 3 s Posteingang abfragen, Nachrichten schicken, bestätigen
import { randomBytes } from "node:crypto";
const BASE = process.argv[2] || "https://pixelkingschat.vercel.app";
const N = +(process.argv[3] || 100), DUR = +(process.argv[4] || 90) * 1000;
const b64u = (n) => randomBytes(n).toString("base64url");
const stats = { req: 0, err: 0, codes: {}, lat: {}, delivery: [] };
async function call(user, route, opts = {}) {
  const t = performance.now();
  const kind = route.split("?")[0];
  try {
    const r = await fetch(`${BASE}/api/${route}`, {
      method: opts.method || (opts.body ? "POST" : "GET"),
      headers: { "content-type": "application/json", ...(user ? { authorization: `PK ${user.id}:${user.token}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const ms = performance.now() - t;
    (stats.lat[kind] ??= []).push(ms);
    stats.req++;
    if (!r.ok) { stats.err++; stats.codes[`${kind}:${r.status}`] = (stats.codes[`${kind}:${r.status}`] || 0) + 1; return null; }
    return await r.json();
  } catch (e) {
    stats.req++; stats.err++;
    const k = `${kind}:${e.name}`; stats.codes[k] = (stats.codes[k] || 0) + 1;
    return null;
  }
}
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))]); };

console.log(`▶ ${N} Nutzer registrieren sich GLEICHZEITIG …`);
let t0 = performance.now();
const users = (await Promise.all(Array.from({ length: N }, async (_, i) => {
  const token = b64u(32);
  const r = await call(null, "register", { body: { pub: b64u(65), token, name: `Lasttest ${i + 1}` } });
  return r && { id: r.id, token, sent: new Map(), got: 0 };
}))).filter(Boolean);
console.log(`  ${users.length}/${N} Konten in ${Math.round(performance.now() - t0)} ms, alle Codes verschieden: ${new Set(users.map((u) => u.id)).size === users.length}`);

const end = Date.now() + DUR;
let sentTotal = 0, gotTotal = 0;
console.log(`▶ ${users.length} Nutzer chatten ${DUR / 1000} s lang gleichzeitig (Abfrage alle 3 s, jede Person schreibt ca. alle 8 s) …`);
t0 = performance.now();
await Promise.all(users.map(async (u, i) => {
  const partner = users[i ^ 1] || users[0];
  await new Promise((r) => setTimeout(r, Math.random() * 3000));
  let nextSend = Date.now() + Math.random() * 8000, nextPres = Date.now();
  while (Date.now() < end) {
    if (Date.now() >= nextSend) {
      const mid = b64u(12);
      const ts = Date.now();
      partner.sent.set(mid, ts);
      if (await call(u, "send", { body: { to: partner.id, iv: b64u(12), ct: b64u(300), mid } })) sentTotal++;
      nextSend = Date.now() + 6000 + Math.random() * 4000;
    }
    if (Date.now() >= nextPres) {
      call(u, `presence?ids=${partner.id}`);
      nextPres = Date.now() + 20000;
    }
    const r = await call(u, "inbox?v=1");
    if (r?.messages?.length) {
      for (const m of r.messages) {
        const s = u.sent.get(m.mid);
        if (s) { stats.delivery.push(Date.now() - s); u.sent.delete(m.mid); gotTotal++; }
      }
      await call(u, "ack", { body: { keys: r.messages.map((m) => m.key) } });
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}));
const secs = (performance.now() - t0) / 1000;
// Rest abholen
await new Promise((r) => setTimeout(r, 3000));
for (const u of users) { const r = await call(u, "inbox"); for (const m of r?.messages || []) if (u.sent.delete(m.mid)) gotTotal++; }

console.log(`\n=== Ergebnis ===`);
console.log(`Anfragen: ${stats.req} (${(stats.req / secs).toFixed(1)}/s), Fehler: ${stats.err} (${((stats.err / stats.req) * 100).toFixed(2)} %)`, stats.codes);
console.log(`Nachrichten: ${sentTotal} gesendet, ${gotTotal} angekommen (${((gotTotal / Math.max(1, sentTotal)) * 100).toFixed(1)} %)`);
console.log(`Zustellzeit (Senden → beim Partner): Median ${pct(stats.delivery, 0.5)} ms, 95 % unter ${pct(stats.delivery, 0.95)} ms, max ${pct(stats.delivery, 1)} ms`);
for (const [k, a] of Object.entries(stats.lat)) console.log(`  ${k.padEnd(9)} n=${String(a.length).padStart(5)}  Median ${pct(a, 0.5)} ms  p95 ${pct(a, 0.95)} ms  max ${pct(a, 1)} ms`);
// Testkonten wieder löschen
let deleted = 0;
for (let i = 0; i < users.length; i += 20) {
  const part = users.slice(i, i + 20);
  for (let tries = 0; tries < 3; tries++) {
    const r = await Promise.all(part.map((u) => (u.gone ? true : call(u, "me", { method: "DELETE" }).then((x) => (u.gone = !!x)))));
    if (r.every(Boolean)) break;
  }
  deleted += part.filter((u) => u.gone).length;
}
console.log(`Testkonten gelöscht: ${deleted}/${users.length}`);
