# 👑 Pixelkingschat

Anonymer Chat **ohne Telefonnummer und ohne E-Mail** – live: https://pixelkingschat.netlify.app

## Funktionen
- **Kontakt per Code oder QR-Code** – jeder bekommt einen zufälligen 8-stelligen Code. Einladungslink `/#add=CODE` öffnet direkt den Chat.
- **Ende-zu-Ende-verschlüsselt** – ECDH P-256 → HKDF-SHA256 → AES-256-GCM, komplett im Browser (WebCrypto). Der private Schlüssel verlässt nie das Gerät, der Server sieht nur verschlüsselte Bytes.
- **Auto-Löschen nach 24 Stunden** – auf dem Gerät und auf dem Server (abgeholte Nachrichten werden sofort gelöscht, nicht abgeholte stündlich nach 24 h).
- **Einmal-Nachrichten** – lassen sich nur einmal ansehen, danach gelöscht; der Absender sieht „geöffnet“.
- **Sicherheitsnummer** pro Kontakt zum Abgleichen gegen Man-in-the-Middle.

## Technik
- `public/` – statisches Frontend (HTML/CSS/JS, QR-Bibliotheken lokal in `public/vendor/`)
- `netlify/functions/api.mts` – API (`/api/register`, `/api/key/:id`, `/api/send`, `/api/inbox`, `/api/ack`, `DELETE /api/me`) mit Netlify Blobs
- `netlify/functions/cleanup.mts` – stündlicher Job, löscht abgelaufene Nachrichten

## Lokal starten
```bash
npm install
npx netlify dev
```
