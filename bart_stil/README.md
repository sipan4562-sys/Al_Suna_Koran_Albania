# Bart_stil

Eine Website, auf der man sich Bartstile ansehen kann – mit Illustration, Wuchsdauer,
Trimmer-Einstellungen in Millimetern und einem Schritt-für-Schritt-Tutorial pro Stil.
Dazu ein 1:1-Tutorial an einem echten Beispielfoto.

## Öffnen

`bart_stil/index.html` im Browser öffnen. Keine Installation, kein Build, keine externen
Abhängigkeiten – reines HTML, CSS und JavaScript.

## Inhalt

- **31 Bartstile** in fünf Kategorien: Kurz & Stoppeln, Vollbärte, Kinnbärte, Schnurrbärte,
  Koteletten & Kanten. Jeder Stil mit eigener SVG-Illustration, Werkzeugliste, Millimeter-
  Angaben, nummeriertem Tutorial, Tipps und typischen Fehlern.
- **1:1-Tutorial am Foto**: sieben Schritte von der Ausgangslage bis zur fertigen Basis.
  Zu jedem Schritt lässt sich die passende Hilfslinie (Mittelachse, Wangenlinie, Halslinie,
  Längenzonen, Übergangszone) über das Foto einblenden.
- **Gesichtsform-Finder** für sechs Gesichtsformen mit passenden Stilvorschlägen.
- **Werkzeug-Guide**, **Pflegeplan** und **FAQ**.
- Suche, Filter nach Kategorie/Gesichtsform/Schwierigkeit, Favoriten (localStorage),
  Hell-/Dunkel-Modus, vollständig responsiv.

## Beispielfoto

`assets/beispiel-zensiert.jpg` stammt vom Abgebildeten selbst. Vor der Verwendung wurde es
aufgerichtet, zugeschnitten und die Gesichtspartie (Stirn, Augen, Nase) grob verpixelt –
der Bartbereich bleibt scharf, weil er der eigentliche Inhalt ist.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Seitenstruktur und statische Inhalte |
| `style.css` | Design, Farb-Tokens für Hell/Dunkel, Responsive-Layout |
| `data.js` | Datenbank aller Bartstile, Gesichtsform-Texte, Foto-Tutorial-Schritte |
| `beards.js` | SVG-Zeichner: baut aus einem `art`-Rezept eine komplette Illustration |
| `app.js` | Oberfläche: Raster, Filter, Dialog, Hilfslinien, Finder |
