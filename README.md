# MatheMeister – Mathematik-Lernplattform

Eine moderne, professionelle und vollständig responsive Mathematik-Lernwebsite,
gebaut mit reinem **HTML, CSS und JavaScript** – ohne Build-Schritt und ohne
externe Frameworks. Einfach `index.html` öffnen.

## ✨ Funktionen

- **Modernes Design** mit klarer Navigation und professionellen Animationen
- **Heller & dunkler Modus** (Dark Mode) mit gespeicherter Präferenz
- **Vollständig responsive** für Smartphone, Tablet, Laptop und Desktop
- **Suchfunktion** über alle Themen, Formeln und Übungen (Tastenkürzel `/`)
- **Mehrsprachig** vorbereitet – Deutsch als Standard, Englisch integriert
- **Barrierefrei**: Skip-Link, ARIA-Rollen, Tastaturbedienung, `prefers-reduced-motion`
- **SEO-optimiert**: Meta-Tags, Open Graph, strukturierte Daten (JSON-LD)
- **Lernfortschritt & Favoriten** werden lokal im Browser gespeichert
- **Benutzer-Dashboard** mit Fortschritts-Ring und Quiz-Statistik

## 📚 Lernbereiche

Grundlagen · Algebra · Geometrie · Trigonometrie · Analysis · Statistik ·
Schulmathematik · Hochschulmathematik – mit **47 Themen** und über **140 Übungen**.

Jede Erklärung enthält: einfache Erklärung, ausführliche Erklärung, wichtige
Formeln, Beispiele, Schritt-für-Schritt-Rechenwege, häufige Fehler und ein
interaktives Quiz mit sofortiger Auswertung.

## 🧰 Werkzeuge

- **Übungsbereich** mit gemischtem Quiz und Auswertung
- **Formelsammlung** – nach Themen sortiert und durchsuchbar
- **Rechner**: Taschenrechner, Prozent-, Bruch-, Gleichungs- und Geometrierechner
- **Lernpfade** für Anfänger, Fortgeschrittene und Experten
- **Blog** mit Lernstrategien sowie Tipps und Tricks

## 🗂️ Projektstruktur

```
index.html              # App-Shell (Header, Footer, Such-Modal)
assets/
  css/style.css         # Komplettes Design inkl. Light/Dark & Responsive
  js/
    i18n.js             # Mehrsprachigkeit (DE/EN)
    content.js          # Alle Lerninhalte (Kategorien, Themen, Übungen)
    blog.js             # Blog-Beiträge
    calculators.js      # Rechner-Logik (sichere Ausdrucksauswertung)
    app.js              # Hash-Router, Views, Theme, Suche, Quiz, Fortschritt
```

## 🚀 Nutzung

Es ist kein Server nötig. Zum lokalen Testen kann ein einfacher Static-Server
verwendet werden:

```bash
python3 -m http.server 8000
# danach http://localhost:8000 öffnen
```

## 🔒 Datenschutz

Alle Nutzerdaten (Fortschritt, Favoriten, Demo-Login) werden ausschließlich
lokal im Browser (`localStorage`) gespeichert – es gibt kein Backend und kein
Tracking.
