# Automatisierte Tests

Die Tests steuern das echte Spiel in Chromium (Playwright) über die Debug-Schnittstelle `window.TLN`.

```bash
npm run build
npm run preview &                 # http://localhost:4173
node tests/mechanics.cjs          # Kollision, Türen, Schlösser, Kriechgang, Treppe, KI, Rätselkette, Tod/Checkpoint, Ende
node tests/touch.cjs              # iPhone-Emulation: Joystick, Umsehen (Multitouch), Buttons, Tastenfeld
node tests/ai-soak.cjs            # 10 Minuten simulierte Monster-KI (Hänger, Positionsfehler, Ausnahmen)
```

Voraussetzung: `npm i -D playwright` und ein installierter Chromium (`npx playwright install chromium`).
