# العراق — Entdecke den Irak · Discover Iraq

Eine hochmoderne, dreisprachige Website über das Land Irak: Kultur, Küche, Geschichte, Städte, Feste und Reise-Infos – alles einzeln abgebildet und erklärt.

**Sprachen:** العربية (mit vollständigem RTL-Layout) · English · Deutsch – umschaltbar über die Sprachleiste oben rechts, die Auswahl wird gespeichert.

## Öffnen

Einfach `index.html` im Browser öffnen – keine Installation, kein Server, keine externen Bibliotheken nötig.

## Inhalte

- **Fakten** – animierte Zahlen zu Bevölkerung, Fläche, UNESCO-Welterbe u. v. m.
- **Geschichte** – Zeitleiste von Sumer und der Keilschrift über Babylon und das Haus der Weisheit bis zum modernen Irak.
- **Kultur** – Maqam, Oud, Dichtung, Kalligrafie, Gastfreundschaft, kurdische Kultur, Handwerk, Fußball.
- **Küche** – 10 Gerichte als 3D-Flip-Karten: Masgouf, Dolma, Kubba, Quzi, Biryani, Tashreeb, Samoon, Kahi & Geymar, Kleicha, Chai.
- **Städte & Wunder** – Bagdad, Babylon, Erbil, Ur, Samarra, Mossul, Basra, Nadschaf & Kerbela, die Ahwar-Marschen.
- **Feste & Traditionen** – Ramadan & Mheibes, Eid, Newroz, Arbain, Hochzeiten, Abende am Tigris.
- **Reise** – beste Reisezeit, Währung, Visum, Sprache, Etikette, Verkehr + kleine Sprachschule (Irakisch-Arabisch).

- **3D-Flagge mit echter Stoffphysik** – die irakische Flagge weht in einer eigenen Verlet-Cloth-Simulation (`assets/flag.js`): 3D-Punktgitter mit Distanz-Constraints, organischer Wind aus überlagerten Wellen + zufälligen Böen (kein Loop), Falten-Beleuchtung über Flächennormalen, der Takbir „الله أكبر" verformt sich als Textur physikalisch mit dem Stoff. Maus-Hover verstärkt den Wind, Wischen schiebt den Stoff an. Adaptive Qualität hält auch schwache Geräte bei 60 fps.

## Technik

- **3D ohne Bibliotheken:** Die rotierende Zikkurat von Ur im Hero ist eine eigene Mini-3D-Engine auf Canvas 2D (Perspektiv-Projektion, Painter-Algorithmus, Lambert-Beleuchtung) mit Sternenhimmel und Goldstaub-Partikeln.
- **Illustrierte Inhalte:** Alle 10 Gerichte sind detailreiche, handgezeichnete SVG-Illustrationen (mit animiertem Dampf) auf einer schwebenden 3D-Bühne; alle 9 Orte zeigen ihr echtes Wahrzeichen als Vektorszene (Ischtar-Tor, Malwiya-Minarett, Mudhif …) mit funkelnden Lichtern; Kultur, Feste und Reise haben eigene Icon-Illustrationen (`assets/art.js`).
- **3D-Interaktionen:** Tilt-Effekt auf Karten (Maus), CSS-3D-Flip-Karten in der Küche, Scroll-Reveal-Animationen, animierte Zähler.
- **i18n:** Komplettes Umschalten aller Inhalte inkl. `dir="rtl"`, arabischer Schriftarten und lokalisierter Zahlenformate (arabisch-indische Ziffern).
- **Design:** Farbwelt des Ischtar-Tors (Lapislazuli-Blau + glasiertes Gold), Glassmorphism, responsive vom Smartphone bis zum Desktop, `prefers-reduced-motion` wird respektiert.

## Deployment

Der GitHub-Actions-Workflow (`.github/workflows/deploy.yml`) veröffentlicht die Seite bei jedem Push auf `main` automatisch über GitHub Pages.
