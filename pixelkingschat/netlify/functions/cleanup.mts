import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

// Läuft stündlich: löscht nicht abgeholte Nachrichten und Melde-Fingerabdrücke,
// die älter als 24 Stunden sind.
const TTL_MS = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

export default async () => {
  const now = Date.now();
  const inbox = getStore({ name: "pk-inbox", consistency: "strong" });
  let deleted = 0;
  for await (const page of inbox.list({ paginate: true })) {
    for (const b of page.blobs) {
      const ts = Number(b.key.split("/")[1]?.split("-")[0]);
      if (!ts || now - ts > TTL_MS) {
        await inbox.delete(b.key);
        deleted++;
      }
    }
  }

  const franks = getStore({ name: "pk-franks", consistency: "strong" });
  const minBucket = Math.floor((now - TTL_MS) / HOUR) - 1;
  let fDeleted = 0;
  for await (const page of franks.list({ paginate: true })) {
    for (const b of page.blobs) {
      const bucket = Number(b.key.split("/")[0]);
      if (!bucket || bucket < minBucket) {
        await franks.delete(b.key);
        fDeleted++;
      }
    }
  }
  console.log(`cleanup: ${deleted} Nachrichten, ${fDeleted} Fingerabdrücke gelöscht`);
};

export const config: Config = {
  schedule: "17 * * * *", // jede Stunde um :17 (UTC)
};
