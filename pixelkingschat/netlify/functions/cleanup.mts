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
  // Gruppeninhalte (nach Stunden-Bucket), Stories und Story-Aufrufe
  const gb = getStore({ name: "pk-gbody", consistency: "strong" });
  for await (const page of gb.list({ paginate: true }))
    for (const b of page.blobs) if (Number(b.key.split("/")[0]) < minBucket) await gb.delete(b.key);
  for (const name of ["pk-stories", "pk-storyviews"]) {
    const st = getStore({ name, consistency: "strong" });
    for await (const page of st.list({ paginate: true }))
      for (const b of page.blobs) {
        const ts = Number(b.key.split("/")[1]?.split("-")[0]);
        if (!ts || now - ts > TTL_MS) await st.delete(b.key);
      }
  }
  console.log(`cleanup: ${deleted} Nachrichten, ${fDeleted} Fingerabdrücke gelöscht`);
};

export const config: Config = {
  schedule: "17 * * * *", // jede Stunde um :17 (UTC)
};
