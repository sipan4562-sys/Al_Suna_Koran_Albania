import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

// Löscht stündlich alle nicht abgeholten Nachrichten, die älter als 24 Stunden sind.
const TTL_MS = 24 * 60 * 60 * 1000;

export default async () => {
  const store = getStore({ name: "pk-inbox", consistency: "strong" });
  const now = Date.now();
  let deleted = 0;
  for await (const page of store.list({ paginate: true })) {
    for (const b of page.blobs) {
      const ts = Number(b.key.split("/")[1]?.split("-")[0]);
      if (!ts || now - ts > TTL_MS) {
        await store.delete(b.key);
        deleted++;
      }
    }
  }
  console.log(`cleanup: ${deleted} abgelaufene Nachrichten gelöscht`);
};

export const config: Config = {
  schedule: "17 * * * *", // jede Stunde um :17 (UTC)
};
