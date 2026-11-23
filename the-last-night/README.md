# THE LAST NIGHT

Ein 3D-Survival-Horrorspiel für den Browser (Desktop und iPhone/Android), gebaut mit **Three.js / WebGL**.

> Katholische Heil- und Pflegeanstalt St. Aldric, 31. Oktober 1987. Du wachst in Zimmer 116 auf und erinnerst dich an nichts.
> Du musst vor Sonnenaufgang entkommen, während etwas durch die Lüftungsschächte kriecht und dich sucht.

Texturen, Modelle, Animationen, Soundeffekte und Musik werden beim Start prozedural erzeugt. Das Spiel lädt keine externen Assets. Nur die optionale Vollversion nutzt Google-Anmeldung und Stripe; Stripe erhebt dabei eine Gebühr pro Zahlung, aber keine Grundgebühr.

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

Ablauf: Anmeldung mit Google (Google Identity Services), dann Bezahlung über Stripe Checkout. Möglich sind Karte, PayPal, Apple Pay, Google Pay usw., je nachdem, was im Stripe-Dashboard aktiviert ist. Der Kauf wird über die Google-Konto-ID dem Konto zugeordnet und serverseitig bei Stripe geprüft. Dafür braucht es keine eigene Datenbank, denn Stripe speichert die Käufe.

Server-Funktionen (Vercel): `api/config.js`, `api/me.js`, `api/checkout.js`, `api/verify.js`.

### Einrichtung (einmalig)

1. **Google:** In der Google Cloud Console unter „APIs & Dienste → Anmeldedaten“ eine *OAuth-Client-ID* vom Typ Webanwendung erstellen. Unter „Autorisierte JavaScript-Quellen“ `https://the-last-night-seven.vercel.app` eintragen.
2. **Stripe:** Ein Konto anlegen und im Dashboard unter „Entwickler → API-Schlüssel“ den geheimen Schlüssel kopieren. Zum Testen eignet sich zuerst `sk_test_…`.
3. **Vercel:** Im Projekt `the-last-night` unter „Settings → Environment Variables“ zwei Variablen anlegen: `GOOGLE_CLIENT_ID` und `STRIPE_SECRET_KEY`. Optional sind `PRICE_CENTS` (Standard 1000) und `PUBLIC_URL`. Danach neu deployen.
4. **Rechtliches:** In `public/impressum.html`, `public/datenschutz.html` und `public/agb.html` die Angaben in eckigen Klammern ersetzen.

Hinweis: Das Spiel läuft im Browser. Wer technisch versiert ist, kann clientseitige Freischaltungen grundsätzlich manipulieren. Die Bezahlung selbst wird aber immer serverseitig geprüft.
