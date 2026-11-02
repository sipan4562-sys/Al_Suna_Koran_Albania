# GRENZKONTROLLE – Die korrupten Gobolde · تفتيش الحدود – الغوبولد الفاسدون

Zweisprachiges Browser-Spiel (Deutsch / Arabisch) über einen erfundenen Grenzposten in der Wüste Al-Ghubar
an der Straße nach Bagdad. Eine einzige `index.html` mit HTML5-Canvas und Vanilla JS: keine Libraries,
kein Build, keine externen Assets, keine Netzwerkzugriffe.

## Starten

`index.html` direkt im Browser öffnen (Doppelklick). Läuft auf dem Handy (Hoch- und Querformat, Touch) und am PC.

## Steuerung

| Aktion | Touch / Maus | Tastatur |
|---|---|---|
| Prüfwerkzeug Siegel / Vermögen / Papiere / Fracht | Werkzeug antippen | `1` `2` `3` `4` |
| Annehmen / Abweisen | Buttons unten | `A` / `D` |
| Weiter (nächster Reisender, Start) | Button | `Enter` / `Leertaste` |
| Sprache wechseln | `DE \| ع` oben | `S` |
| Neustart | Einstellungen ⚙ | `R` (im Spiel zweimal drücken) |
| FPS-Zähler / Grafikstufe | Einstellungen ⚙ | `F` / `Q` |

## Schwierigkeit anpassen

Alles steht im Objekt `CONFIG` (Modul 4, Spiellogik):

- `tierStarts: [1, 4, 7, 10, 13]` – ab welchem Reisenden Stufe 1–5 gilt
- `shiftLength`, `hearts`, `pointsPerTraveler`, `bossesPerShift`
- `scoreBase`, `scoreGut`, `scoreSaved`, `heartsOnShiftChange`

Neue Reisende: einen Eintrag in `TRAVELERS` (Modul 2) ergänzen – mit `type`, `tier` und allen Texten als `[de, ar]`.
Die prozedurale Generierung (Modul 3) übernimmt, sobald die Akten einer Stufe aufgebraucht sind.

## Dritte Sprache ergänzen

1. Kürzel in `LANGS` eintragen, `LANG_META` (`dir`, `canvasScale`) und `FONT_CANVAS` ergänzen, eine `#app[lang="xx"]`-CSS-Regel anlegen.
2. `L.xx = { … }` mit allen Schlüsseln aus `L.de` anlegen (fehlende Schlüssel fallen auf Deutsch zurück).
3. In `TRAVELERS` jedem Text-Array ein drittes Element anhängen (`[de, ar, xx]`, bei Befunden `[wert, de, ar, xx]`
   und in `prepareTraveler` `a[3]` mitnehmen).
4. Wortlisten `W` der Generierung um die dritte Form erweitern.
5. Im Sprachknopf `#btnLang` ein weiteres `<span data-i18n="lang.xx">` ergänzen.
