# 👑 Pixelkingschat

Anonymer Chat **ohne Telefonnummer und ohne E-Mail** – live: https://pixelkingschat.netlify.app

## Funktionen
- **Kontakt per Code oder QR-Code** – jeder bekommt einen zufälligen 8-stelligen Code. Einladungslink `/#add=CODE` öffnet direkt den Chat.
- **Ende-zu-Ende-verschlüsselt** – ECDH P-256 → HKDF-SHA256 → AES-256-GCM, komplett im Browser (WebCrypto). Der private Schlüssel verlässt nie das Gerät, der Server sieht nur verschlüsselte Bytes.
- **Auto-Löschen nach 24 Stunden** – auf dem Gerät und auf dem Server (abgeholte Nachrichten werden sofort gelöscht, nicht abgeholte stündlich nach 24 h).
- **Einmal-Nachrichten** – lassen sich nur einmal ansehen, danach gelöscht; der Absender sieht „geöffnet“.
- **Bilder senden** – ebenfalls Ende-zu-Ende-verschlüsselt, auch als Einmal-Bild.
- **Profilbilder** – für alle sichtbar, die deinen Code kennen.
- **Push-Benachrichtigungen** – auch auf dem Homebildschirm (iPhone ab iOS 16.4: „Teilen → Zum Home-Bildschirm“). Die Benachrichtigung verrät nur den Absender, nie den Inhalt.
- **Melden** von einzelnen Nachrichten, ganzen Chats und Profilbildern. Gemeldete Inhalte werden automatisch geprüft; bei Verstößen gibt es Verwarnungen bzw. eine Sperre (schwere Verstöße sofort, sonst nach 3 Verwarnungen). Meldungen sind fälschungssicher: Der Server speichert beim Senden nur einen Hash jeder Nachricht, und beim Melden wird nur der Schlüssel genau dieser Nachricht herausgegeben.
- **Blockieren** – Nachrichten blockierter Kontakte werden schon auf dem Server verworfen.
- **Eindeutige Codes** – jeder Code wird genau einmal vergeben, auch nach dem Löschen eines Kontos nie wieder.
- **Homebildschirm-App (PWA)** – installierbar auf iPhone und Android, startet wie eine echte App (auch offline), mit Schnellaktionen „Kontakt hinzufügen“ und „QR-Code scannen“. Mit „Konto übertragen“ nimmst du deinen Code und deine Kontakte aus dem Browser in die App mit (wichtig auf dem iPhone, weil die App dort einen eigenen Speicher hat).
- **Sicherheitsnummer** pro Kontakt zum Abgleichen gegen Man-in-the-Middle.

## Technik
- `public/` – statisches Frontend (HTML/CSS/JS, QR-Bibliotheken lokal in `public/vendor/`)
- `public/sw.js` – Service Worker für Push-Benachrichtigungen
- `netlify/functions/api.mts` – API mit Netlify Blobs: Registrierung, Schlüssel, Senden/Abholen, Push-Abos, Profilbilder, Blockieren, Meldungen (automatische Prüfung über Netlify AI Gateway)
- `netlify/functions/cleanup.mts` – stündlicher Job, löscht abgelaufene Nachrichten und Melde-Hashes
- Meldungen liegen im Blob-Store `pk-reports` (Netlify → Data & Storage → Blobs)

## Lokal starten
```bash
npm install
npx netlify dev
```
