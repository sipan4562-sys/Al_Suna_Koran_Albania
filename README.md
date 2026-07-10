# MatheMeister – Mathematik-Lernplattform

Eine moderne, vollständig responsive Mathematik-Lernwebsite: verständliche
Erklärungen, Beispiele, interaktive Übungen, Formelsammlung und Rechner – von
den Grundlagen bis zur Hochschulmathematik.

## Funktionen

- **8 Lernbereiche & 40+ Themen** – Grundlagen, Algebra, Geometrie,
  Trigonometrie, Analysis, Statistik, Schul- und Hochschulmathematik
- Jedes Thema mit **einfacher & ausführlicher Erklärung, Beispielen,
  Schritt-für-Schritt-Rechenwegen, Grafiken, häufigen Fehlern, Übungen &
  Lösungen**
- **Heller & dunkler Modus** (Dark Mode) mit Speicherung
- **Globale Suchfunktion** über Themen, Formeln und Blog (Tastenkürzel `/`)
- **Mehrsprachig vorbereitet** – Deutsch (Standard) & Englisch
- **Interaktive Quizze** mit sofortiger Auswertung
- **Durchsuchbare Formelsammlung** mit Kopierfunktion
- **5 Rechner** – wissenschaftlicher Taschenrechner, Prozent-, Bruch-,
  Gleichungs- und Geometrierechner
- **Lernpfade** (Anfänger / Fortgeschrittene / Experten)
- **Benutzerbereich & Dashboard** mit Lernfortschritt und Favoriten
  (lokal im Browser gespeichert)
- **Blog** mit Lernstrategien und Erklärungen
- **Barrierefrei** (Skip-Links, ARIA, Tastaturnavigation, `prefers-reduced-motion`)
- **SEO-optimiert** (Meta-Tags, Open Graph, strukturierte Daten)

## Technik

Reines **HTML, CSS und JavaScript** ohne Build-Schritt oder externe
Laufzeit-Abhängigkeiten – schnelle Ladezeiten, als statische Seite über
GitHub Pages ausgeliefert.

```
index.html               – App-Shell, SEO-Meta, Fonts
assets/css/main.css      – Design-System (Light/Dark, responsiv, Animationen)
assets/js/data.js        – Lerninhalte (Themen, Formeln, Quizze, Blog)
assets/js/i18n.js        – Oberflächen-Übersetzungen (DE/EN)
assets/js/calculators.js – Rechner-Logik
assets/js/app.js         – Router, Suche, Theme, Fortschritt, Rendering
```

## Lokal starten

Einfach `index.html` im Browser öffnen oder einen kleinen Server starten:

```bash
python3 -m http.server 8000
# http://localhost:8000
```
