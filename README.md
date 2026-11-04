# MatheLab

Eine moderne, interaktive Mathematik-Lernwebsite. Vollständig responsive (Smartphone, Tablet, Laptop, Desktop), ohne externe Abhängigkeiten.

## Öffnen

Einfach `index.html` im Browser öffnen (Doppelklick) – es ist keine Installation und kein Server nötig.

## Funktionen

- **Funktionsplotter** – Funktionen in Echtzeit zeichnen, zoomen, verschieben, Koordinaten ablesen (sin, cos, tan, sqrt, log, abs, ^, π, e).
- **Mathe-Trainer** – unendlich viele Aufgaben in 7 Bereichen und 3 Schwierigkeitsgraden mit Punkten, Serie und Trefferquote.
- **Themen** – 6 kompakte Lektionen von Grundrechenarten bis Analysis.
- **Formelsammlung** – Algebra, Geometrie, Trigonometrie zum Aufklappen.
- **Fortschritt** – lokal gespeichert (localStorage), ohne Anmeldung.
- **Hell/Dunkel-Modus**, animierte Oberfläche, `prefers-reduced-motion` respektiert.

---

# PromptLab · ChatGPT verstehen (`chatgpt/`)

Lernseite über ChatGPT auf **Deutsch, Englisch und Maltesisch** – eine einzelne Datei (`chatgpt/index.html`), ohne externe Abhängigkeiten. Auf GitHub Pages erreichbar unter `/chatgpt/`.

- **Abschnitte:** Was ist ChatGPT? · Alltag · Gute Prompts · Grenzen & Halluzinationen · Datenschutz
- **Quiz:** 5 Multiple-Choice-Fragen mit sofortigem Feedback, Erklärung und Link zum passenden Abschnitt
- **Sprachwahl:** DE / EN / MT oben rechts; wird gespeichert. Direktlink per `?lang=de|en|mt`
- **Übersetzungen bearbeiten:** Deutsch steht direkt im HTML, Englisch und Maltesisch im Objekt `T` im Skript (gleiche `data-i18n`-Schlüssel); Quiz-Texte im Objekt `QUIZ`
