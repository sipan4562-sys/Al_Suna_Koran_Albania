// Pixelkingschat Service Worker – zeigt Benachrichtigungen bei neuen Nachrichten.
// Der Inhalt bleibt Ende-zu-Ende-verschlüsselt: die Benachrichtigung zeigt nur, WER geschrieben hat.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

function contactName(code) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("pk", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of ["raw", "media", "meta"]) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      };
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        try {
          const tx = req.result.transaction("meta", "readonly");
          const g = tx.objectStore("meta").get("names");
          g.onsuccess = () => resolve((g.result || {})[code] || null);
          g.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch {}
      const from = typeof data.from === "string" ? data.from : "";
      const name = (from && (await contactName(from))) || (from ? `Code ${from}` : "Pixelkingschat");
      // Ist die App gerade sichtbar geöffnet, reicht die Anzeige in der App selbst.
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const visible = wins.some((w) => w.visibilityState === "visible" && w.focused);
      for (const w of wins) w.postMessage({ type: "push", from });
      // iOS verlangt zu jeder Push-Nachricht eine sichtbare Benachrichtigung.
      const iOS = /iPhone|iPad|iPod/.test(self.navigator.userAgent);
      if (visible && !iOS) return;
      await self.registration.showNotification(name, {
        body: "🔒 Neue verschlüsselte Nachricht",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: from ? `chat-${from}` : "pk",
        renotify: true,
        data: { from },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const from = event.notification.data?.from;
  const url = from ? `/#chat=${from}` : "/";
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if ("focus" in w) {
          w.postMessage({ type: "open", from });
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
