// Pixelkingschat Service Worker – zeigt Benachrichtigungen bei neuen Nachrichten.
// Der Inhalt bleibt Ende-zu-Ende-verschlüsselt: die Benachrichtigung zeigt nur, WER geschrieben hat.

const CACHE = "pk-shell-v3";
const SHELL = [
  "/",
  "/index.html",
  "/app.js",
  "/style.css",
  "/vendor/qrcode.js",
  "/vendor/jsQR.js",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })()
  );
});

// App-Dateien: erst Netzwerk (immer aktuell), bei fehlender Verbindung aus dem Cache.
// /api/ wird nie zwischengespeichert – Nachrichten landen nie im Cache.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/.netlify/")) return;
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req.mode === "navigate" ? "/index.html" : req, copy));
        }
        return res;
      } catch {
        const cached = await caches.match(req.mode === "navigate" ? "/index.html" : req, { ignoreSearch: true });
        return cached || new Response("Offline", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
      }
    })()
  );
});

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
