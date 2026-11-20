# PixelCam

Web-App für **Videoaufnahmen, in denen deine Augen automatisch verpixelt werden**. Über die Einstellungen lässt sich auch das **ganze Gesicht** verpixeln. Alle Aufnahmen werden **verschlüsselt** auf dem Gerät gespeichert. Läuft auf Handy (Android, iPhone) und PC im Browser und lässt sich als App installieren.

## Benutzung

1. `pixelcam/` über **HTTPS** öffnen (z. B. GitHub Pages: `https://<benutzer>.github.io/<repo>/pixelcam/`).
   Lokal: im Repo-Ordner `python3 -m http.server 8000` und dann `http://localhost:8000/pixelcam/` öffnen.
2. Passwort festlegen. Damit wird der Tresor erstellt.
3. Kamera erlauben → roter Knopf startet bzw. stoppt die Aufnahme (am PC auch Taste **R**).
4. Unter **Aufnahmen** abspielen, als Video speichern/teilen, verschlüsselt exportieren oder löschen.

Installieren als App: im Browser-Menü *„Zum Startbildschirm hinzufügen“* bzw. *„App installieren“*. Danach funktioniert PixelCam auch offline.

## Funktionen

| Bereich | Optionen |
| --- | --- |
| Verpixelung | Augen oder ganzes Gesicht · Pixel oder schwarzer Balken · Pixelgröße · Abdeckung · Augenbrauen mit verpixeln · Form (Rechteck/Oval) · weit entfernte Gesichter |
| Sicherheitsmodus | Wird kein Gesicht erkannt, wird das **ganze Bild** verpixelt (Standard: an) |
| Aufnahme | 480p/720p/1080p · Qualität · MP4/WebM · Ton an/aus · Vorschau spiegeln · Front-/Rückkamera |
| Sicherheit | Auto-Sperre (1/5/15 Min.) · Sperren beim Verlassen · Passwort ändern · Tresor löschen |

## So funktioniert der Schutz

- **Verpixelt, bevor etwas gespeichert wird:** Jedes Kamerabild wird in einer unsichtbaren Fläche erkannt und verpixelt. Erst dann wird es in die sichtbare Fläche kopiert, die aufgenommen wird. Unverpixelte Bilder gelangen nie in die Aufnahme.
- **Gesichtserkennung lokal:** MediaPipe *BlazeFace full-range* (WebAssembly) erkennt alle Gesichter im Bild, von ganz nah bis ca. 5 m. Wird ein Gesicht kurz verloren, wird die letzte Position in Bewegungsrichtung mitgeführt und vergrößert. Danach greift der Sicherheitsmodus.
- **Verschlüsselung:** AES-256-GCM. Der zufällige Datenschlüssel ist mit einem aus dem Passwort abgeleiteten Schlüssel (PBKDF2-SHA-256, 600 000 Runden) verpackt. Die Aufnahme wird **jede Sekunde blockweise verschlüsselt** in IndexedDB geschrieben. Auch Vorschaubild und Metadaten sind verschlüsselt.
- **Kein Server:** keine Uploads, kein Konto, keine Analyse. Modell und WebAssembly liegen in `vendor/`.

### Wichtig zu wissen

- Das **Passwort ist nicht wiederherstellbar.** Ohne Passwort sind die Aufnahmen verloren.
- Die Aufnahmen liegen im Speicher **dieses Browsers**. Wer Browserdaten löscht, löscht auch die Aufnahmen. Zum Sichern: *„Verschlüsselt exportieren“* (`.pxcam`-Datei, lässt sich auf jedem Gerät mit demselben Passwort wieder öffnen).
- *„Video speichern“* erzeugt eine normale, **unverschlüsselte** (aber bereits verpixelte) Videodatei.
- Keine Gesichtserkennung ist perfekt: Bei extremen Winkeln, starker Verdeckung oder sehr schlechtem Licht kann ein Gesicht unerkannt bleiben. Deshalb ist der Sicherheitsmodus standardmäßig an.

## Technik

- Reines HTML/CSS/JavaScript (ES-Module), keine Build-Schritte.
- `js/engine.js` – Gesichtserkennung und Verpixelung
- `js/vault.js` – Verschlüsselung, IndexedDB, Export/Import
- `js/app.js` – Oberfläche, Kamera, Aufnahme
- `sw.js` – Service Worker für den Offline-Betrieb
- Browser: aktuelle Versionen von Chrome, Edge, Firefox, Safari (iOS ab 16.4).

## Drittanbieter

- [MediaPipe Tasks Vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) 0.10.35, Apache-2.0
- BlazeFace full-range Modell (MediaPipe), Apache-2.0
