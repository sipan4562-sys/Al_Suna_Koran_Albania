# Lumenni · Persönliche KI-Assistentin

Eine eigenständige Web-App (eine einzige `index.html`, keine Installation nötig): Lumenni ist ein persönliches „KI-Betriebssystem" für den Alltag — Chat, Projekt-Dashboard und Aufgabenliste in einem.

## Öffnen

`index.html` doppelklicken — läuft direkt im Browser, komplett offline.

## Funktionen

- **Boot-Sequenz** — „LUMENNI SYSTEM ONLINE" beim Start.
- **Chat mit Lumenni** — im Lokal-Modus mit eingebauten Demo-Antworten (Projekte, Pläne, Content-Ideen, Aufgaben-Befehle wie `todo: …`).
- **Echte KI (optional)** — unter ⚙ Einstellungen einen Anthropic-API-Key eintragen, dann antwortet Claude (Standard: Claude Opus 4.8) mit dem Lumenni-Protokoll als System-Prompt. Der Key wird nur lokal im Browser (localStorage) gespeichert.
- **Projekt-Dashboard** — Neburypt, Kanal-Membership, Gaming-Setups, Content (Canno/Reeezz).
- **Aufgabenliste** — anlegen, abhaken, löschen; lokal gespeichert (localStorage).
- **Responsive** — Smartphone, Tablet und Desktop.

## Hinweis zum API-Key

Den API-Key nur auf eigenen Geräten speichern. Er verlässt den Browser ausschließlich in Richtung `api.anthropic.com`.
