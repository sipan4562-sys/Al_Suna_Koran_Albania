# PixelCam

Web-App für **Videoaufnahmen, in denen deine Augen automatisch verpixelt werden**. Über die Einstellungen lässt sich auch das **ganze Gesicht** verpixeln. **Ohne Anmeldung.** Alle Aufnahmen werden **verschlüsselt** auf dem Gerät gespeichert und **nach 1 Stunde automatisch gelöscht**, außer du hast sie vorher heruntergeladen. Läuft auf Handy (Android, iPhone) und PC im Browser und lässt sich als App installieren.

## Benutzung

1. **Live:** https://pixelcam-eajk.netlify.app – oder `pixelcam/` selbst über **HTTPS** hosten (Netlify/Vercel-Konfiguration liegt bei: `netlify.toml`, `vercel.json`).
   Lokal: im Repo-Ordner `python3 -m http.server 8000` und dann `http://localhost:8000/pixelcam/` öffnen.
2. Kamera erlauben. Der rote Knopf startet bzw. stoppt die Aufnahme (am PC auch die Taste **R**). Eine Anmeldung gibt es nicht.
3. Unter **Aufnahmen** kannst du abspielen, als Video speichern, teilen, verschlüsselt exportieren oder löschen.
4. **Nach 1 Stunde** wird jede Aufnahme automatisch gelöscht, **außer** sie wurde vorher gespeichert, geteilt oder exportiert. Dann bleibt sie erhalten (✓ Behalten).

Installieren als App: im Browser-Menü *„Zum Startbildschirm hinzufügen“* bzw. *„App installieren“*. Danach funktioniert PixelCam auch offline.

## Funktionen

| Bereich | Optionen |
| --- | --- |
| Verpixelung | Augen oder ganzes Gesicht · Pixel oder schwarzer Balken (schmal, dreht sich mit dem Kopf, Stärke und Länge einstellbar) · Pixelgröße · Abdeckung · Augenbrauen mit verpixeln · Form (Rechteck/Oval) · weit entfernte Gesichter |
| Sicherheitsmodus | Wird kein Gesicht erkannt, wird das **ganze Bild** verpixelt (Standard: an) |
| Aufnahme | 480p/720p/1080p · Qualität · MP4/WebM · Ton an/aus · Vorschau spiegeln · Front-/Rückkamera |
| Speicher | Automatisches Löschen nach 1 Stunde (außer heruntergeladen) · alle Aufnahmen löschen |

## So funktioniert der Schutz

- **Verpixelt, bevor etwas gespeichert wird:** Jedes Kamerabild wird in einer unsichtbaren Fläche erkannt und verpixelt. Erst dann wird es in die sichtbare Fläche kopiert, die aufgenommen wird. Unverpixelte Bilder gelangen nie in die Aufnahme.
- **Gesichtserkennung lokal:** MediaPipe *BlazeFace full-range* (WebAssembly) erkennt alle Gesichter im Bild, von ganz nah bis ca. 5 m. Wird ein Gesicht kurz verloren, wird die letzte Position in Bewegungsrichtung mitgeführt und vergrößert. Danach greift der Sicherheitsmodus.
- **Verschlüsselung ohne Anmeldung:** AES-256-GCM mit einem Schlüssel, den die App beim ersten Start selbst erzeugt. Er ist *nicht exportierbar*: Die App kann ihn benutzen, aber niemand kann ihn auslesen oder kopieren. Die Aufnahme wird **jede Sekunde blockweise verschlüsselt** in IndexedDB geschrieben. Auch Vorschaubild und Metadaten sind verschlüsselt.
- **Automatisches Löschen:** 1 Stunde nach der Aufnahme werden Video, Vorschaubild und Metadaten gelöscht, außer die Aufnahme wurde heruntergeladen, geteilt oder exportiert. Ist die App zu diesem Zeitpunkt geschlossen, wird beim nächsten Öffnen gelöscht, bevor irgendetwas angezeigt wird.
- **Kein Server:** keine Uploads, kein Konto, keine Analyse. Modell und WebAssembly liegen in `vendor/`.

### Wichtig zu wissen

- **Ohne Anmeldung** kann jeder, der dein entsperrtes Gerät benutzt, die App öffnen und noch nicht gelöschte Aufnahmen ansehen.
- Die Aufnahmen liegen im Speicher **dieses Browsers**. Wer Browserdaten löscht, löscht auch die Aufnahmen.
- *„Verschlüsselt exportieren“* erzeugt eine `.pxcam`-Datei mit einem selbst gewählten Passwort. Sie lässt sich auf jedem Gerät über *„Datei öffnen“* mit diesem Passwort wieder abspielen.
- *„Video speichern“* erzeugt eine normale, **unverschlüsselte** (aber bereits verpixelte) Videodatei.
- Keine Gesichtserkennung ist perfekt: Bei extremen Winkeln, starker Verdeckung oder sehr schlechtem Licht kann ein Gesicht unerkannt bleiben. Deshalb ist der Sicherheitsmodus standardmäßig an.

## Technik

- Reines HTML/CSS/JavaScript (ES-Module), keine Build-Schritte.
- `js/engine.js` – Gesichtserkennung und Verpixelung
- `js/vault.js` – Verschlüsselung, IndexedDB, automatisches Löschen, Export/Import
- `js/app.js` – Oberfläche, Kamera, Aufnahme
- `sw.js` – Service Worker für den Offline-Betrieb
- Browser: aktuelle Versionen von Chrome, Edge, Firefox, Safari (iOS ab 16.4).

## Drittanbieter

- [MediaPipe Tasks Vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) 0.10.35, Apache-2.0
- BlazeFace full-range Modell (MediaPipe), Apache-2.0
