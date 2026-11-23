# THE LAST NIGHT

Ein 3D-Survival-Horrorspiel für den Browser (Desktop und iPhone/Android), gebaut mit **Three.js / WebGL**.

> Katholische Heil- und Pflegeanstalt St. Aldric, 31. Oktober 1987. Du wachst in Zimmer 116 auf und erinnerst dich an nichts.
> Du musst vor Sonnenaufgang entkommen, während etwas durch die Lüftungsschächte kriecht und dich sucht.

Texturen, Modelle, Animationen, Soundeffekte und Musik werden beim Start prozedural erzeugt. Das Spiel lädt keine externen Assets. Nur die optionale Vollversion nutzt ein eigenes Spielerkonto und Stripe; Stripe erhebt dabei eine Gebühr pro Zahlung, aber keine Grundgebühr.

## Starten

```bash
cd the-last-night
npm install
npm run dev        # Entwicklungsserver (auch im LAN, z. B. fürs iPhone)
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal testen (http://localhost:4173)
```

Den Debug-Modus aktivierst du mit `?debug` an der URL. Dann ist das Spielobjekt unter `window.TLN` erreichbar.

## Deployment auf Vercel

Der Ordner `dist/` ist eine statische Website. Zwei Wege:

- **Statisch:** `npm run build`, danach den Inhalt von `dist/` deployen, zum Beispiel mit `npx vercel deploy dist --prod`.
- **Über Git:** Ein Vercel-Projekt mit *Root Directory* `the-last-night` anlegen. Das Framework „Vite“ wird automatisch erkannt, Build `npm run build`, Output `dist`.

## Steuerung

| Aktion | Tastatur/Maus | Touch |
|---|---|---|
| Laufen | W A S D | linke Bildschirmhälfte ziehen |
| Umsehen | Maus | rechte Bildschirmhälfte ziehen |
| Rennen | Shift | `»` oder Stick ganz nach vorn |
| Ducken | C (umschalten), Strg (halten) | `⤓` |
| Interagieren / Verstecken | E | `E` |
| Taschenlampe | F | Lampensymbol |
| Batterie wechseln | R | `BAT` |
| Verbandskasten | H | `+` |
| Flasche werfen | G | `WURF` |
| Inventar / Dokumente | Tab / I | `INV` |
| Pause | Esc | `❚❚` |

## Spielsysteme

- **Welt:** Die Anstalt ist aus einem Raster gebaut: Flure mit Kreuzen und Heiligenbildern, 8 Patientenzimmer, Schwesternstation, Eingangshalle mit Madonna, Kapelle (Altar, Kruzifix, Buntglas, Kerzen, Beichtstuhl als Versteck), OP-Saal, Isolationszellen, Hydrotherapie, Personaltrakt (Archiv, Überwachungsraum, Direktorenbüro), ein geheimes Archiv hinter einem Bücherregal, ein Kriechgang, ein echtes Treppenhaus und ein Keller mit Generatorraum, Heizung, überflutetem Lager, Pathologie und Wäscherei.
- **Grafik:** PBR-Materialien mit prozeduralen Farb-, Normal- und Rauheitstexturen. Die Taschenlampe wirft dynamische Schatten durch eine Lichtmaske. Dazu kommen ein Pool flackernder Punktlichter, die auf ihren Raum begrenzt sind (kein Licht durch Wände), volumetrische Lichtkegel, Staub im Lichtstrahl, Nebel, Bloom, Filmkorn, chromatische Aberration und Schadenseffekte.
- **Monster („Subjekt 0“):** Prozedural modelliert und animiert, mit Bein-IK, Gangzyklus, Zuckungen, Kiefer und Stofffetzen. Die KI hat diese Zustände: Patrouille, Bemerken, Untersuchen, Verfolgen, Angriff, Erholung, Suche, Spind-Kontrolle und Lüftungsschacht-Reise. Sie sieht mit Sichtkegel, Sichtlinie und Lichtabhängigkeit, hört mit Verdeckung durch Wände und navigiert mit A* auf dem Raster, über Türen und über Lüftungsschächte. Ein „Director“ steuert das Tempo, ohne das Monster zu teleportieren.
- **Gameplay:** Schlüssel und Türen, Tastenfeld-Code (über Überwachungskamera 3), drei Sicherungen für den Generator, Geheimregal und Notverriegelung. Außerdem Inventar und Dokumente, Taschenlampen-Batterie, Spinde als Versteck, Leben und Ausdauer, Checkpoints (localStorage), Game Over, Hauptmenü, Pausemenü und Einstellungen.
- **Sound:** Web-Audio-Synthese mit räumlichem HRTF-Klang und Verdeckung. Es gibt Schritte je Untergrund (Fliesen, Beton, Holz, Metall, Wasser, Polster), knarrende Türen, Schreie, Atmosphäre, Herzschlag, Atmen, Monsterstimme und dynamische Musik in drei Schichten (Grundangst, Spannung, Verfolgung).
- **Performance:** Statische Geometrie wird pro Material und Raum zusammengefasst. Räume hinter geschlossenen Türen werden nicht gezeichnet (Portal-Culling über Türen). Es gibt Qualitätsstufen (Niedrig/Mittel/Hoch), und Mobilgeräte nutzen automatisch „Mittel“.

## Vollversion (Einmalkauf 10 €, kein Abo)

Die Basisversion ist komplett spielbar. Die Vollversion schaltet zusätzlich frei:

- **Revolver** (Klick/V, Touch ⌖): Ein Treffer betäubt das Monster und treibt es in die Flucht. Startmunition 6 + 6, weitere Kisten im Haus (nur in der Vollversion sichtbar).
- **Kreuzkette** (Q, Touch ✝): Alle 2 Minuten für 12 Sekunden aktivierbar. Das Monster kann dich dann nicht angreifen, auch nicht im Spind, und weicht zurück.
- **Gebet** (B, Touch 🙏): Zeigt das Monster 6 Sekunden lang durch Wände (Abklingzeit 60 s).
- **Gesegnete Batterien:** Die Taschenlampe hält doppelt so lange.

Ablauf: Spieler legen im Spiel ein eigenes Konto mit E-Mail und Passwort an. Ein Google-Konto ist nicht nötig. Danach bezahlen sie über Stripe Checkout; möglich sind Karte, PayPal, Apple Pay, Google Pay usw., je nachdem, was im Stripe-Dashboard aktiviert ist. Der Kauf ist an das Spielerkonto gebunden und gilt auf jedem Gerät, auf dem man sich anmeldet.

**Konten:** Sie liegen in einem privaten Vercel-Blob-Speicher (`the-last-night-accounts`, Region Frankfurt). Passwörter werden nur als scrypt-Hash gespeichert, und die E-Mail steht nicht im Dateinamen. Sitzungen sind HMAC-signiert und 30 Tage gültig; nach einem Passwortwechsel werden alte Sitzungen ungültig. Nach 8 Fehlversuchen wird das Konto 10 Minuten gesperrt. Spieler können ihr Passwort ändern und ihr Konto selbst löschen. „Passwort vergessen“ per E-Mail gibt es nicht, weil dafür ein E-Mail-Dienst nötig wäre.

Server-Funktionen (Vercel): `api/config.js`, `api/auth.js` (Registrierung/Anmeldung), `api/me.js`, `api/password.js`, `api/delete.js`, `api/checkout.js`, `api/verify.js`.

### Einrichtung

Bereits erledigt: Der Blob-Speicher ist angelegt und mit dem Projekt verbunden (`BLOB_READ_WRITE_TOKEN`), und `SESSION_SECRET` ist als geschützte Umgebungsvariable gesetzt. Konten funktionieren damit sofort.

Für Zahlungen fehlt nur noch:

1. **Stripe:** Ein Konto anlegen und im Dashboard unter „Entwickler → API-Schlüssel“ den geheimen Schlüssel kopieren. Zum Testen eignet sich zuerst `sk_test_…`.
2. **Vercel:** Im Projekt `the-last-night` unter „Settings → Environment Variables“ die Variable `STRIPE_SECRET_KEY` anlegen. Optional sind `PRICE_CENTS` (Standard 1000) und `PUBLIC_URL`. Danach neu deployen.
3. **Rechtliches:** In `public/impressum.html`, `public/datenschutz.html` und `public/agb.html` die Angaben in eckigen Klammern ersetzen.

Hinweis: Das Spiel läuft im Browser. Wer technisch versiert ist, kann clientseitige Freischaltungen grundsätzlich manipulieren. Die Bezahlung selbst wird aber immer serverseitig geprüft.
