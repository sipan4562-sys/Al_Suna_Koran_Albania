# Bart_stil

Eine Website, auf der man sich Bartstile ansehen kann – mit Illustration, Wuchsdauer,
Trimmer-Einstellungen in Millimetern und einer Schritt-für-Schritt-Anleitung pro Stil.
Dazu ein 1:1-Tutorial an einem animierten Gesicht. In drei Sprachen: Deutsch, Englisch
und Arabisch (mit RTL-Layout).

## Öffnen

`bart_stil/index.html` im Browser öffnen. Keine Installation, kein Build, keine externen
Abhängigkeiten – reines HTML, CSS und JavaScript.

## Inhalt

- **31 Bartstile** in fünf Kategorien: Kurz & Stoppeln, Vollbärte, Kinnbärte, Schnurrbärte,
  Koteletten & Kanten. Jeder Stil mit eigener SVG-Illustration, Werkzeugliste, Millimeter-
  Angaben, nummerierter Anleitung, Tipps und typischen Fehlern – vollständig übersetzt.
- **1:1-Tutorial am animierten Gesicht**: eine gezeichnete Figur mit 3-Tage-Bart, die
  blinzelt, atmet und die Brauen hebt. Zu jedem der sieben Schritte lässt sich die passende
  Hilfslinie einblenden (Symmetrieachse, Wangenlinie, Halslinie, Längenzonen, Übergangszone).
- **Gesichtsform-Finder** für sechs Gesichtsformen mit passenden Stilvorschlägen.
- **Werkzeug-Guide**, **Pflegeplan** und **FAQ**.
- Suche, Filter nach Kategorie/Gesichtsform/Schwierigkeit, Favoriten (localStorage),
  Hell-/Dunkel-Modus, vollständig responsiv.

## Sprachen

Umschaltbar über die Kopfzeile (DE / EN / ع); die Wahl wird lokal gespeichert. Beim ersten
Besuch entscheidet die Browsersprache. Für Arabisch stellt die Seite `dir="rtl"` um; Zahlen-
bereiche wie „6–8" werden dabei in LTR-Isolate gefasst, damit sie nicht umkippen.

Alle Texte sind geschlechtsneutral formuliert: Rollenbezeichnungen stehen in der
Doppelpunkt-Form (z. B. „Barbier:in", „Einsteiger:in"), Anleitungen sprechen direkt an und
setzen kein Geschlecht voraus.

## Illustrationen

Alle Gesichter sind gezeichnete SVG-Illustrationen, die zur Laufzeit aus einem `art`-Rezept
zusammengesetzt werden (Bartmasse, Kinnform, Schnurrbart, Koteletten, Länge, Textur).
Es werden keine Fotos realer Personen verwendet.

## Website-Ersteller:in

Instagram: [@rezzzzzzzzxvhdcjh](https://www.instagram.com/rezzzzzzzzxvhdcjh?igsh=MTVqNzgzMWJyNTRxYg%3D%3D&utm_source=qr)
– verlinkt in der Kopfzeile und in der Fußzeile der Seite.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Seitengerüst mit `data-i18n`-Haken |
| `style.css` | Design, Farb-Tokens für Hell/Dunkel, RTL-Unterstützung, Animationen |
| `data.js` | Sprachunabhängige Struktur der Stile (Kategorie, Level, Zeichen-Rezept) |
| `lang.de.js`, `lang.en.js`, `lang.ar.js` | Alle Texte je Sprache |
| `beards.js` | SVG-Zeichner: baut aus einem `art`-Rezept eine komplette Illustration |
| `app.js` | Oberfläche: Sprachwechsel, Raster, Filter, Dialog, Hilfslinien, Finder |
