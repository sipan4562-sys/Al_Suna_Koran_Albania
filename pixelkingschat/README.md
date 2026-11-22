# 👑 Pixelkingschat

Anonymer Chat **ohne Telefonnummer und ohne E-Mail** – live: https://pixelkingschat.vercel.app (vorher: https://pixelkingschat.netlify.app)

## Hosting
- **Vercel** (aktuell): statische Dateien aus `public/`, Server als gebündelte Funktion `api/main.mjs` (Quelle: `server/`, bauen mit `npm run build:vercel`), Speicher in **Supabase/Postgres** (`POSTGRES_URL`), Region fra1. Inhaltsprüfung über das Vercel AI Gateway (benötigt eine im Vercel-Team hinterlegte Kreditkarte für die kostenlosen Credits). `MIGRATE_FROM=https://pixelkingschat.netlify.app` erlaubt den Umzug alter Konten.
- **Netlify** (weiterhin lauffähig): `netlify/functions/api.mts` nutzt denselben Kern mit Netlify Blobs.

## Funktionen
- **Kontakt per Code oder QR-Code** – jeder bekommt einen zufälligen 8-stelligen Code. Einladungslink `/#add=CODE` öffnet direkt den Chat.
- **Ende-zu-Ende-verschlüsselt** – ECDH P-256 → HKDF-SHA256 → AES-256-GCM, komplett im Browser (WebCrypto). Der private Schlüssel verlässt nie das Gerät, der Server sieht nur verschlüsselte Bytes.
- **Auto-Löschen nach 24 Stunden** – auf dem Gerät und auf dem Server (abgeholte Nachrichten werden sofort gelöscht, nicht abgeholte stündlich nach 24 h).
- **Einmal-Nachrichten** – lassen sich nur einmal ansehen, danach gelöscht; der Absender sieht „geöffnet“.
- **Bilder senden** – ebenfalls Ende-zu-Ende-verschlüsselt, auch als Einmal-Bild.
- **Profilbilder** – für alle sichtbar, die deinen Code kennen.
- **Push-Benachrichtigungen** – auch auf dem Homebildschirm (iPhone ab iOS 16.4: „Teilen → Zum Home-Bildschirm“). Die Benachrichtigung verrät nur den Absender, nie den Inhalt.
- **Melden** von einzelnen Nachrichten, ganzen Chats und Profilbildern. Gemeldete Inhalte werden automatisch geprüft; bei Verstößen gibt es Verwarnungen bzw. eine Sperre (schwere Verstöße sofort, sonst nach 3 Verwarnungen). Meldungen sind fälschungssicher: Der Server speichert beim Senden nur einen Hash jeder Nachricht, und beim Melden wird nur der Schlüssel genau dieser Nachricht herausgegeben.
- **Automatische Maßnahmen** – bei jeder Meldung entscheidet die Prüfung selbst (unter Berücksichtigung früherer Verstöße): Verwarnung, Nachrichten aus allen Chats entfernen, Timeout (1 Std bis 7 Tage) oder dauerhafte Sperre. Betroffene sehen einen Hinweis und ein Banner; gesperrte Konten werden bei allen Kontakten markiert. Technisch: Claude (claude-opus-5-5) über das Netlify AI Gateway, in der App wird das nicht erwähnt.
- **Videos** im Chat, in Gruppen und in Stories (bis 60 Sek.) – große Videos werden im Browser verkleinert, verschlüsselt in Stücken hochgeladen (`/api/media`).
- **GIFs wie bei Discord** – GIF-Tab im Emoji-Menü mit 16 eigenen animierten Pixel-GIFs (`public/gifs/`), eigene GIFs vom Gerät und GIPHY-Suche (aktiv, sobald die Umgebungsvariable `GIPHY_API_KEY` gesetzt ist).
- **Sprachnachrichten spulen** – ⏪/⏩ 10 Sek., auf die Wellenform tippen, Geschwindigkeit 1×/1,5×/2×.
- **Öffentliche Stories** – in den Einstellungen oder pro Story wählbar; erscheinen für alle unter „🌍 Entdecken“ und werden vor dem Veröffentlichen automatisch geprüft.
- **Pixel-Emojis überall, automatisch**: `autoPixelize()` in `public/emoji.js` beobachtet die ganze Seite (MutationObserver) und ersetzt jedes Emoji in Knöpfen, Menüs, Hinweisen und Dialogen durch das passende Pixel-Bild. Das gilt auch für alles, was künftig neu dazukommt: neue Knöpfe einfach normal mit Emoji schreiben. Ausgenommen sind Eingabefelder (`textarea`, `input`, `select`) und Elemente mit `data-px="off"`. System-Benachrichtigungen können technisch keine Bilder zeigen.
- **Story-Musik** (`public/music.js`): 12 eigene Songs von „Pixelkings Studio“, die live im Browser synthetisiert werden (WebAudio: Melodie, Bass, Arpeggio, Drums; Stile von Synthwave über Lo-Fi und Trap bis Orientalisch/Hijaz). Eigene Kompositionen bedeuten keine Lizenzkosten und keinen Download. Titel und Künstler stehen als Sticker auf der Story.
  - **Rechtliches:** Bekannte Songs (Charts usw.) sind urheberrechtlich geschützt (GEMA/Labels). Dafür bräuchte man Lizenzverträge wie Instagram/TikTok, deshalb gibt es sie nicht.
  - **Eigene Musik:** Upload bis 3 MB, nur bei Kontakte-Stories, mit Pflichtangabe von Titel und Künstler und der Bestätigung, die Rechte zu haben. Die Datei wird verschlüsselt über `/api/media` hochgeladen.
  - Mit Musik läuft ein Story-Video ohne Originalton.
- **Automatische Untertitel** für Story-Videos (`public/subs.js`): Whisper (`onnx-community/whisper-base`, transformers.js 3.7.1) läuft komplett auf dem Gerät. Das Modell (~80 MB) wird einmalig von Hugging Face geladen und im Browser gecacht, nicht über Vercel. 11 Sprachen, die Zeilen lassen sich vor dem Posten korrigieren. Die CSP erlaubt dafür `cdn.jsdelivr.net`, `huggingface.co`, `*.hf.co` und `'wasm-unsafe-eval'`. Untertitel öffentlicher Stories werden mitgeprüft.
- **Gruppen-Rechte** (Gruppen-Info ⓘ): Der **Besitzer** (wer die Gruppe erstellt hat) kann
  - das **Löschen nach 24 Std ausschalten**, dann bleiben die Nachrichten auf den Handys. Videos/GIFs werden dabei gleich lokal gespeichert. Wer länger als 24 Std offline ist, bekommt Verpasstes nicht nachgeliefert, weil der Server nichts länger hält.
  - einstellen, **wer schreiben darf** (Alle / Admins / Nur ich) und ob die anderen dann **mit Emojis reagieren** dürfen,
  - einstellen, **wer Umfragen erstellen darf** (Alle / Admins / Nur ich),
  - **Admins** ernennen. Admins dürfen Mitglieder hinzufügen, entfernen und ihnen **Timeouts** geben (10 Min bis 7 Tage), aber nicht dem Besitzer oder anderen Admins.

  Weil Gruppen Ende-zu-Ende-verschlüsselt sind, prüft jedes Gerät die Regeln selbst: Nachrichten, Reaktionen und Stimmen von Leuten ohne Recht oder mit Timeout werden verworfen.
- **Reaktionen**: Nachricht antippen und ein Pixel-Emoji wählen (in Gruppen und Einzelchats).
- **Umfragen** in Gruppen (📊 im ＋-Menü): 2–10 Antworten, optional Mehrfachauswahl, Live-Ergebnis mit Balken und „Wer hat abgestimmt?“.
- **Animierte Profilbilder & Profilrahmen** (Einstellungen → „✨ Animiert“ / „💫 Rahmen“): 59 wehende Pixel-Flaggen (inkl. Progress Pride) (mit Suche) und 19 animierte Pixel-Motive (u. a. Opfergabe mit allsehendem Auge, Schlange & Apfel, Pentagramm, Alien, Wasserfall) als Profilbild, dazu runde, animierte Rahmen (16 Effekte wie Neon, Feuer, Krone, Galaxie, Glitch, Pentagramm, Schlange, Ritual, UFO, außerdem jede Flagge als Farbring mit wehender Flagge an der Seite). Alles wird als SVG im Browser erzeugt (`public/decor.js`), es fließt kein Datenvolumen. Gespeichert werden nur Kennungen (`pav`, `deco`) am Konto. Eigene **GIFs/animierte WebPs** bis 1 MB gehen auch als Profilbild.
- **Links** in Nachrichten sind anklickbar und öffnen sich in einem neuen Tab, ohne Weitergabe der App-Adresse. Nur `http(s)`-Links werden erkannt, `javascript:` und Ähnliches nicht.
- **YouTube-Videos** (auch Shorts und Links mit Startzeit) laufen direkt im Chat über `youtube-nocookie.com`. Der Player lädt erst beim Antippen, vorher geht keine Anfrage an YouTube.
- **Automatische Updates** – jeder Build bekommt eine Versionskennung (`scripts/stamp.mjs` → `version.json`). Offene Apps (iPhone, Android, PC, installiert oder im Browser) erkennen neue Versionen und laden sich selbst neu – aber nie bei einer Aufnahme oder beim Tippen (dann erscheint ein Banner).
- **Geräte-Anpassung** – Funktionen, die ein Gerät nicht kann (z. B. Aufnahme), werden ausgeblendet; die App-Höhe passt sich der Bildschirmtastatur an (iOS); reduzierte Animationen, wenn im System eingestellt.
- **Pro Kontakt/Gruppe einstellbar** – Stummschalten (8 Std, 1 Woche, immer). Beides wird serverseitig durchgesetzt (keine Push-Benachrichtigung, kein Klingeln).
- **Online-Status** (grüner Punkt, „zuletzt online“) und **Gesehen-Anzeige mit Pixel-Auge** – beides in den Einstellungen abschaltbar.
- **Konto sichern** – dauerhafter Speicher, automatische Sicherheitskopie im Gerät und verschlüsseltes Cloud-Backup mit Passwort (PBKDF2 + AES-GCM im Browser). Wiederherstellen mit Code + Passwort auf jedem Gerät.
- **Besitzer-Bereich** – unter Profil mit dem Besitzer-Code (Umgebungsvariable `OWNER_CODE`, steht nicht im Code) einmalig an ein Konto binden. Danach: alle Meldungen mit Inhalt und automatischer Einschätzung ansehen, verwarnen, Nachrichten löschen, Timeout, sperren/entsperren, Profilbild entfernen, Konten per Code nachschlagen, automatische Prüfung an/aus. Schutz: 5 Fehlversuche pro Konto, 30 insgesamt pro Tag; nur ein Besitzer.
- **Blockieren** – Nachrichten blockierter Kontakte werden schon auf dem Server verworfen.
- **Eindeutige Codes** – jeder Code wird genau einmal vergeben, auch nach dem Löschen eines Kontos nie wieder.
- **Dateien senden** (bis 2,5 MB) – Ende-zu-Ende-verschlüsselt.
- **Sprachnachrichten** (bis 3 Minuten) mit Wellenform, auch in Gruppen und als Einmal-Sprachnachricht. Gesendete Audio-Dateien lassen sich direkt im Chat abspielen.
- **Pixel-Emojis** – jedes Emoji wird im Browser automatisch in ein eigenes Pixel-Art-Bild umgerechnet (in Nachrichten, Namen, Stories, Chatliste) und hat eine eigene Emoji-Auswahl.
- **Stories (24 Stunden)** – Foto- oder Text-Stories für alle Kontakte, verschlüsselt mit einem Story-Schlüssel, der pro Kontakt einzeln verpackt wird. Mit Aufrufzahl, Löschen und Melden.
- **Gruppen** – Inhalt wird einmal verschlüsselt hochgeladen, der Schlüssel pro Mitglied einzeln verpackt. Admin kann einladen, entfernen und umbenennen. In den Einstellungen lässt sich „Automatisch zu Gruppen hinzufügen“ ausschalten – dann kommt zuerst eine Einladung im Chat.
- **Eigene Farben** (9 Akzentfarben + Farbwähler, 5 Hintergrundtöne) und **Chat-Hintergründe** (generierte Muster oder eigenes Foto, für alle Chats oder pro Chat).
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

## Lasttest

`node scripts/loadtest.mjs <URL> <Personen> <Sekunden>` simuliert gleichzeitige Nutzer. Jeder fragt alle 3 s den Posteingang ab, schreibt etwa alle 8 s seinem Partner und bestätigt Empfang. Am Ende löscht er seine Testkonten wieder.
Gemessen auf Vercel (fra1) mit Supabase, ohne einen einzigen Fehler:

| Nutzer | Anfragen/s | Nachrichten angekommen | Zustellzeit Median | Antwortzeit Median |
|---|---|---|---|---|
| 100 | 55 | 901 / 901 | 1,8 s | 160 ms |
| 300 | 166 | 1771 / 1771 | 1,8 s | 157 ms |

Die Zustellzeit kommt fast nur von der 3-Sekunden-Abfrage, der Server selbst antwortet in ca. 0,16 s.

