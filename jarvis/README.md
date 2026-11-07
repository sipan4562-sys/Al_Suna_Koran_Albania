# J.A.R.V.I.S. – Persönlicher KI-Assistent

Futuristische KI-Zentrale im Stil eines holografischen HUDs: **sprechen** (Mikrofon) oder **schreiben** (Chat) –
JARVIS antwortet per Text und Stimme. Läuft auf PC, Mac, Tablet und Smartphone, ohne horizontales Scrollen.

**Live:** https://jarvis-chi-puce.vercel.app (öffentlich, ohne Anmeldung)

| Bereich | Umgesetzt |
| --- | --- |
| Oberfläche | Animierter holografischer Kern (eigener Canvas-Renderer, 3D-Partikelkugel, audioreaktives Spektrum), Zustände *Bereit / Höre zu / Denke nach / Antworte / Spreche*, Start-Sequenz, Glassmorphism, Systemmodule & Telemetrie (Desktop) |
| Chat | Streaming in Echtzeit, Markdown (Tabellen, Listen), Syntax-Highlighting mit Kopieren-Button, Ladeanimation, Verlauf mit Suchen/Umbenennen/Löschen |
| Sprache | Spracheingabe (Web Speech API, optional Server-Transkription), satzweise Sprachausgabe (Browser-Stimmen, optional OpenAI oder ElevenLabs), Unterbrechen, Konversationsmodus |
| KI | Anthropic Claude (Streaming, Werkzeuge, Websuche optional), OpenAI-kompatible Anbieter, Demo-Modus ohne Schlüssel, automatischer Ersatzanbieter bei Ausfällen |
| Fähigkeiten | Persönliches Gedächtnis, Wetter (Open-Meteo, kostenlos); vorbereitet: Kalender, Erinnerungen, Dateianalyse, Smart Home, Desktop-Link |
| Sicherheit | Schlüssel nur auf dem Server, optionaler Zugangscode, signierte HttpOnly-Cookies, Rate-Limits, CSP & Security-Header, Eingabevalidierung |

---

## Schnellstart (lokal)

Voraussetzung: **Node.js 20.9 oder neuer**.

```bash
cd jarvis
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
npm run dev
```

Dann <http://localhost:3000> öffnen. Ohne API-Schlüssel startet JARVIS im **Demo-Modus** (Uhrzeit, echtes Wetter,
Gedächtnis, Markdown-Beispiele) – ideal zum Ausprobieren der Oberfläche.

## Welche Werte muss ich eintragen?

Alle Einstellungen stehen in `.env.local` (lokal) bzw. unter *Vercel → Projekt → Settings → Environment Variables*.
Schlüssel landen **nie** im Browser.

| Variable | Pflicht? | Wofür |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | für echte KI | Schlüssel von <https://console.anthropic.com/> – aktiviert Claude |
| `JARVIS_ACCESS_CODE` | **ja, sobald ein KI-Schlüssel online genutzt wird** | Zugangscode für die Weboberfläche. Ohne ihn kann jeder im Internet dein API-Guthaben verbrauchen |
| `JARVIS_SESSION_SECRET` | empfohlen mit Zugangscode | Zufälliger Wert ≥ 32 Zeichen (`openssl rand -base64 48`) zum Signieren der Sitzungen |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | für dauerhaften Verlauf in der Cloud | Lokal reicht die SQLite-Datei. Auf Vercel ist der Speicher sonst flüchtig – kostenlose Datenbank z. B. bei [Turso](https://turso.tech) (`libsql://…`) |
| `OPENAI_API_KEY` | optional | Natürliche Server-Stimme (`gpt-4o-mini-tts`) und Spracheingabe in allen Browsern (auch Firefox); alternativ als KI-Anbieter |
| `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` | optional | Besonders natürliche Stimmen |
| `ANTHROPIC_MODEL` | optional | Standard `claude-opus-5-5`; z. B. `claude-sonnet-5-5` für schnellere/günstigere Antworten |
| `ANTHROPIC_WEB_SEARCH` | optional | `true` = Websuche über Claude (ca. 0,01 $ pro Suche) |

Alle weiteren Optionen (Denkaufwand, Fallback-Anbieter, Rate-Limit, Skills) sind in [`.env.example`](.env.example)
kommentiert. Nach Änderungen den Server neu starten bzw. auf Vercel neu deployen.

## Bedienung

- **Mikrofon** (oder **Leertaste**, oder Tippen auf den Kern): sprechen – JARVIS antwortet kurz und gesprochen.
- **Eingabefeld** auf dem Hauptbildschirm oder **Chat** für ausführliche Antworten mit Formatierung und Code.
- **Lautsprecher-Symbol**: Sprachausgabe an/aus. **Esc** stoppt Antwort, Sprache und Zuhören.
- **Einstellungen**: Name, Anrede, Heimatort (Wetter), Sprache, Persönlichkeit (*Klassisch, Freundlich, Präzise,
  Humorvoll*), eigene Anweisungen, Stimme, Konversationsmodus, Gedächtnis verwalten.
- Auf dem Smartphone: Browser-Menü → *Zum Startbildschirm hinzufügen* (PWA, Vollbild).

> Mikrofon und Spracherkennung funktionieren nur über **HTTPS** oder `localhost`. Zum Testen am Handy im
> WLAN: `npm run dev:https` oder einfach die Vercel-Adresse nutzen. Die Browser-Spracherkennung gibt es in
> Chrome, Edge und Safari; für Firefox `OPENAI_API_KEY` setzen.

## Deployment

**Vercel** (eingerichtet): Projekt `jarvis`, *Root Directory* `jarvis`, Framework Next.js, keine
Zugangsbeschränkung. Damit jeder `git push` automatisch online geht, unter *Vercel → Settings → Git* das
GitHub-Repository verbinden.

**Eigener Server / Raspberry Pi** (dauerhafte SQLite-Datei, ideal für spätere Smart-Home-Anbindung):

```bash
npm ci && npm run build
npm start            # Port 3000; Daten liegen in ./data/jarvis.db
```

## Architektur

```
Browser                                   Server (Next.js Route Handlers)
──────────────────────────────            ───────────────────────────────────────────
HUD / Chat (React, Motion, Tailwind)      /api/chat ──► Orchestrator ──► KI-Anbieter
 └─ Controller (Zustand)  ── NDJSON ──►     │             │  ├─ Anthropic (Claude SDK)
     ├─ Spracheingabe (Web Speech /         │             │  ├─ OpenAI-kompatibel
     │   MediaRecorder → /api/speech/stt)   │             │  └─ Demo
     ├─ Sprachausgabe (Satz-Pipeline,       │             ├─ Skills (Wetter, Gedächtnis …)
     │   Browser oder /api/speech/tts)      │             └─ System-Prompt (Persönlichkeit,
     └─ Canvas-Kern (Pegel-Bus)             │                Profil, Erinnerungen, Uhrzeit)
                                            └─ Datenbank (libSQL/SQLite via Drizzle)
```

```
src/
├─ app/                 Seiten, API-Routen (chat, conversations, memories, profile, status, speech, auth)
├─ components/          hud/ (Kern, Panels), home/, chat/, panels/ (Verlauf, Einstellungen), ui/
├─ lib/client/          Controller, Store, API-Client, Stream-Parser
├─ lib/speech/          Spracheingabe, Sprachausgabe, Satz-Zerlegung, Stimmenauswahl
├─ lib/visual/          Canvas-Renderer des holografischen Kerns
├─ server/ai/           Orchestrator, Prompt, Anbieter, Werkzeug-Ausführung
├─ server/skills/       Fähigkeiten (Skills) + Registry
├─ server/db/           Schema, Migrationen, Repositories
└─ proxy.ts             Zugangsschutz (Next.js 16 „Proxy“, früher Middleware)
```

## Erweitern

**Neue Fähigkeit (Skill)** – z. B. Kalender, Erinnerungen, Smart Home:

1. Datei `src/server/skills/<name>.ts` anlegen – Vorlage: [`weather.ts`](src/server/skills/weather.ts).
   Ein Skill liefert Werkzeuge (Name, Beschreibung, Zod-Schema, `run`-Funktion) und optional einen Prompt-Hinweis.
2. In [`registry.ts`](src/server/skills/registry.ts) zu `ALL_SKILLS` hinzufügen (und aus `PLANNED_MODULES` entfernen).

Die Werkzeuge stehen dann automatisch allen KI-Anbietern zur Verfügung und erscheinen im HUD. Eingaben des
Modells werden vor der Ausführung validiert. Für Desktop- oder Smart-Home-Steuerung sollten Aktionen eine
Bestätigung durch den Nutzer erfordern und nur über eine abgesicherte, lokale Schnittstelle laufen.

**Neuer KI-Anbieter:** `ChatProvider` in `src/server/ai/providers/` implementieren und in
[`registry.ts`](src/server/ai/registry.ts) eintragen.

**Datenbank ändern:** Schema in `src/server/db/schema.ts` anpassen und eine neue Migration hinten in
`src/server/db/migrations.ts` anhängen (wird beim Start automatisch ausgeführt).

## Qualität & Tests

```bash
npm run check        # ESLint + TypeScript + Unit-Tests (Vitest)
npm run build
npx playwright install chromium   # einmalig
npm run test:e2e     # End-to-End-Tests (Desktop + Smartphone) gegen den Produktions-Build
```

Die Tests laufen komplett offline: Die Claude-Anbindung wird mit aufgezeichneten SSE-Antworten der
Messages API geprüft, die Oberfläche im Demo-Modus.

## Fehlerbehebung

| Problem | Lösung |
| --- | --- |
| „Demo-Modus“ im HUD | `ANTHROPIC_API_KEY` fehlt → eintragen und Server neu starten / neu deployen |
| Mikrofon-Button grau | Browser ohne Spracherkennung (z. B. Firefox) → Chrome/Edge/Safari nutzen oder `OPENAI_API_KEY` setzen |
| „Mikrofonzugriff verweigert“ | In den Website-Einstellungen des Browsers das Mikrofon erlauben; Seite muss per HTTPS laufen |
| Keine Stimme auf dem iPhone | Einmal auf Mikrofon oder Senden tippen (iOS gibt Audio erst nach einer Berührung frei); Stummschalter prüfen |
| Verlauf auf Vercel verschwindet | Ohne `DATABASE_URL` ist der Speicher dort flüchtig → Turso-Datenbank verbinden |
| `401` vom KI-Dienst | API-Schlüssel prüfen; bei Anthropic auch Guthaben/Limits in der Console |
