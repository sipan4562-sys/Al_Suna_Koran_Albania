/* =============================================================
   MatheMeister – Inhaltsdatenbank (content.js)
   Alle Kategorien, Themen und ausführlichen Lerninhalte.
   Struktur eines Themas:
   {
     id, title, icon, level, tags,
     summary,                 // Kurzbeschreibung (Karten/Suche)
     simple,   (HTML)         // Einfache Erklärung
     detailed, (HTML)         // Ausführliche Erklärung
     examples: [{q, a}],      // Beispiele
     steps:    [ ... ],       // Schritt-für-Schritt
     formulas: [{name, tex}], // Wichtige Formeln
     mistakes: [ ... ],       // Häufige Fehler
     exercises:[{q, choices?, answer, solution}]
   }
   ============================================================= */

const CONTENT = {
  categories: [
    {
      id: "grundlagen",
      title: "Grundlagen der Mathematik",
      icon: "🔢",
      color: "#6366f1",
      description: "Das Fundament: Zahlen, Rechenregeln, Brüche, Prozente und mehr.",
      topics: [
        {
          id: "zahlenarten", title: "Zahlenarten", icon: "🔟", level: "Anfänger",
          tags: ["natürliche zahlen","ganze zahlen","rationale zahlen","reelle zahlen"],
          summary: "Von natürlichen über ganze und rationale bis zu reellen und komplexen Zahlen.",
          simple: "<p>Zahlen werden in <strong>Mengen</strong> eingeteilt. Je nach dem, welche Rechnungen möglich sein sollen, brauchen wir größere Zahlenmengen. Man beginnt beim Zählen (1, 2, 3 …) und erweitert schrittweise um negative Zahlen, Brüche und schließlich um alle Zahlen auf dem Zahlenstrahl.</p>",
          detailed: "<p>Die wichtigsten Zahlenmengen bauen aufeinander auf:</p><ul><li><strong>ℕ – Natürliche Zahlen:</strong> 0, 1, 2, 3 … zum Zählen.</li><li><strong>ℤ – Ganze Zahlen:</strong> … −2, −1, 0, 1, 2 … zusätzlich negative Zahlen.</li><li><strong>ℚ – Rationale Zahlen:</strong> alle Zahlen, die sich als Bruch <em>p/q</em> schreiben lassen (q ≠ 0).</li><li><strong>ℝ – Reelle Zahlen:</strong> alle Zahlen auf dem Zahlenstrahl, inklusive irrationaler Zahlen wie √2 oder π.</li><li><strong>ℂ – Komplexe Zahlen:</strong> erweitern ℝ um die imaginäre Einheit i mit i² = −1.</li></ul><p>Es gilt die Kette: ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ ⊂ ℂ.</p>",
          examples: [
            {q: "Ist −7 eine natürliche Zahl?", a: "Nein. −7 ist eine ganze Zahl (ℤ), aber keine natürliche Zahl, da natürliche Zahlen nicht negativ sind."},
            {q: "Zu welcher Menge gehört 0,75?", a: "0,75 = 3/4 ist rational (ℚ), da es sich als Bruch darstellen lässt."},
            {q: "Ist √2 rational?", a: "Nein. √2 ≈ 1,41421… ist irrational und gehört nur zu ℝ."}
          ],
          steps: [
            "Prüfe, ob die Zahl ganzzahlig und nicht negativ ist → ℕ.",
            "Ist sie ganzzahlig, aber evtl. negativ? → ℤ.",
            "Lässt sie sich als Bruch schreiben (endlich oder periodisch)? → ℚ.",
            "Ist die Dezimaldarstellung unendlich und nicht periodisch? → irrational, nur ℝ."
          ],
          formulas: [{name: "Mengenkette", tex: "ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ ⊂ ℂ"}],
          mistakes: [
            "0 wird vergessen: In der Schule zählt 0 meist zu ℕ.",
            "Periodische Dezimalzahlen (z. B. 0,333…) für irrational halten – sie sind rational (= 1/3)."
          ],
          exercises: [
            {q: "Zu welcher kleinsten Menge gehört −3?", choices: ["ℕ","ℤ","ℚ","ℝ"], answer: 1, solution: "−3 ist ganzzahlig und negativ, also ℤ."},
            {q: "Ist π rational?", choices: ["Ja","Nein"], answer: 1, solution: "π ist irrational, seine Dezimaldarstellung ist unendlich und nicht periodisch."},
            {q: "0,25 gehört zu …", choices: ["nur ℝ","ℚ","ℕ"], answer: 1, solution: "0,25 = 1/4, also rational (ℚ)."}
          ]
        },
        {
          id: "rechenregeln", title: "Rechenregeln", icon: "➕", level: "Anfänger",
          tags: ["punkt vor strich","klammer","reihenfolge","operatoren"],
          summary: "Reihenfolge der Rechenarten: Klammern, Potenzen, Punkt vor Strich.",
          simple: "<p>Wenn in einer Aufgabe mehrere Rechenarten vorkommen, gibt es eine feste <strong>Reihenfolge</strong>: Erst Klammern, dann Potenzen, dann Mal/Geteilt (Punkt) und zuletzt Plus/Minus (Strich).</p>",
          detailed: "<p>Die Regel lautet <strong>KLAPP</strong> bzw. „Punkt vor Strich“:</p><ol><li><strong>Klammern</strong> zuerst – von innen nach außen.</li><li><strong>Potenzen &amp; Wurzeln</strong>.</li><li><strong>Punktrechnung</strong> (·, :) von links nach rechts.</li><li><strong>Strichrechnung</strong> (+, −) von links nach rechts.</li></ol><p>Das Assoziativ-, Kommutativ- und Distributivgesetz helfen beim Umformen.</p>",
          examples: [
            {q: "Berechne 2 + 3 · 4", a: "Punkt vor Strich: 3·4 = 12, dann 2 + 12 = 14."},
            {q: "Berechne (2 + 3) · 4", a: "Klammer zuerst: 2+3 = 5, dann 5·4 = 20."},
            {q: "Berechne 2 · 3²", a: "Potenz zuerst: 3² = 9, dann 2·9 = 18."}
          ],
          steps: [
            "Suche und berechne alle Klammern.",
            "Löse Potenzen und Wurzeln auf.",
            "Rechne alle Mal- und Geteilt-Operationen von links nach rechts.",
            "Rechne zum Schluss Plus und Minus von links nach rechts."
          ],
          formulas: [
            {name: "Distributivgesetz", tex: "a·(b + c) = a·b + a·c"},
            {name: "Kommutativgesetz", tex: "a + b = b + a"}
          ],
          mistakes: [
            "Von links nach rechts rechnen und Punkt-vor-Strich ignorieren.",
            "Minuszeichen vor Klammern nicht auf alle Summanden verteilen."
          ],
          exercises: [
            {q: "Berechne 6 + 2 · 5", choices: ["40","16","20"], answer: 1, solution: "2·5 = 10, dann 6+10 = 16."},
            {q: "Berechne 10 − (4 − 2) · 3", choices: ["4","18","24"], answer: 0, solution: "Klammer: 4−2=2; 2·3=6; 10−6=4."},
            {q: "Berechne 3² + 1", choices: ["10","7","16"], answer: 0, solution: "3²=9; 9+1=10."}
          ]
        },
        {
          id: "brueche", title: "Brüche", icon: "½", level: "Anfänger",
          tags: ["bruchrechnung","kürzen","erweitern","hauptnenner"],
          summary: "Kürzen, erweitern und mit Brüchen rechnen (+, −, ·, :).",
          simple: "<p>Ein Bruch besteht aus <strong>Zähler</strong> (oben) und <strong>Nenner</strong> (unten). Der Nenner sagt, in wie viele Teile das Ganze geteilt wird, der Zähler, wie viele davon gemeint sind.</p>",
          detailed: "<p><strong>Erweitern &amp; Kürzen:</strong> Zähler und Nenner mit derselben Zahl multiplizieren bzw. dividieren – der Wert bleibt gleich.</p><p><strong>Addition/Subtraktion:</strong> gleicher Nenner nötig (Hauptnenner bilden), dann Zähler addieren.</p><p><strong>Multiplikation:</strong> Zähler·Zähler, Nenner·Nenner.</p><p><strong>Division:</strong> mit dem Kehrwert multiplizieren.</p>",
          examples: [
            {q: "1/2 + 1/3", a: "Hauptnenner 6: 3/6 + 2/6 = 5/6."},
            {q: "2/3 · 3/4", a: "(2·3)/(3·4) = 6/12 = 1/2."},
            {q: "3/4 : 1/2", a: "3/4 · 2/1 = 6/4 = 3/2."}
          ],
          steps: [
            "Bei + und −: Hauptnenner (kgV der Nenner) bestimmen.",
            "Beide Brüche auf den Hauptnenner erweitern.",
            "Zähler addieren/subtrahieren, Nenner beibehalten.",
            "Ergebnis so weit wie möglich kürzen."
          ],
          formulas: [
            {name: "Addition", tex: "a/b + c/d = (a·d + c·b)/(b·d)"},
            {name: "Division", tex: "a/b : c/d = a/b · d/c"}
          ],
          mistakes: [
            "Bei Addition einfach Zähler und Nenner getrennt addieren (falsch!).",
            "Vergessen, das Endergebnis zu kürzen."
          ],
          exercises: [
            {q: "1/4 + 1/4 = ?", choices: ["2/8","1/2","1/4"], answer: 1, solution: "Gleicher Nenner: 2/4 = 1/2."},
            {q: "2/5 · 5/6 = ?", choices: ["1/3","10/30","7/11"], answer: 0, solution: "10/30 = 1/3."},
            {q: "1/2 : 1/4 = ?", choices: ["1/8","2","1/2"], answer: 1, solution: "1/2 · 4/1 = 4/2 = 2."}
          ]
        },
        {
          id: "dezimalzahlen", title: "Dezimalzahlen", icon: "🔢", level: "Anfänger",
          tags: ["komma","stellenwert","runden"],
          summary: "Stellenwerte, Umwandlung Bruch↔Dezimal, Runden und Rechnen.",
          simple: "<p>Dezimalzahlen haben ein <strong>Komma</strong>. Nach dem Komma folgen Zehntel, Hundertstel, Tausendstel usw. Sie sind eine andere Schreibweise für Brüche.</p>",
          detailed: "<p>Jede Stelle hat einen Stellenwert: 3,142 = 3 Einer + 1 Zehntel + 4 Hundertstel + 2 Tausendstel.</p><p><strong>Bruch → Dezimal:</strong> Zähler durch Nenner teilen. <strong>Dezimal → Bruch:</strong> Nachkommastellen als Nenner-Zehnerpotenz.</p><p><strong>Runden:</strong> Ist die erste wegfallende Ziffer ≥ 5, wird aufgerundet.</p>",
          examples: [
            {q: "3/4 als Dezimalzahl", a: "3 : 4 = 0,75."},
            {q: "0,6 als Bruch", a: "6/10 = 3/5."},
            {q: "Runde 2,4567 auf 2 Stellen", a: "Dritte Stelle ist 6 ≥ 5 → 2,46."}
          ],
          steps: [
            "Kommastellen ausrichten (bei + und −).",
            "Bei · zuerst ohne Komma rechnen, dann Kommastellen zusammenzählen.",
            "Bei : Divisor kommafrei machen (beide ·10ⁿ)."
          ],
          formulas: [{name: "Runden", tex: "Ziffer ≥ 5 ⇒ aufrunden, sonst abrunden"}],
          mistakes: ["Kommastellen bei Addition nicht untereinander schreiben.","Beim Multiplizieren zu wenige Nachkommastellen setzen."],
          exercises: [
            {q: "1/2 als Dezimalzahl", choices: ["0,2","0,5","0,12"], answer: 1, solution: "1:2 = 0,5."},
            {q: "Runde 7,349 auf 1 Stelle", choices: ["7,3","7,4","7,35"], answer: 0, solution: "Zweite Stelle 4 < 5 → abrunden: 7,3."},
            {q: "0,25 als Bruch", choices: ["1/4","1/5","2/5"], answer: 0, solution: "25/100 = 1/4."}
          ]
        },
        {
          id: "prozentrechnung", title: "Prozentrechnung", icon: "％", level: "Anfänger",
          tags: ["prozent","prozentsatz","grundwert","prozentwert"],
          summary: "Grundwert, Prozentwert und Prozentsatz sicher berechnen.",
          simple: "<p>Prozent bedeutet „von hundert“. 25 % sind 25 von 100, also 1/4. Prozentrechnung hilft bei Rabatten, Zinsen und Statistiken.</p>",
          detailed: "<p>Drei Größen: <strong>Grundwert G</strong> (das Ganze), <strong>Prozentsatz p%</strong> und <strong>Prozentwert W</strong> (der Anteil).</p><p>Grundformel: <code>W = G · p/100</code>. Daraus folgt <code>G = W·100/p</code> und <code>p% = W/G · 100 %</code>.</p>",
          examples: [
            {q: "Wie viel sind 20 % von 80?", a: "W = 80 · 20/100 = 16."},
            {q: "12 sind wie viel % von 48?", a: "p = 12/48 · 100 = 25 %."},
            {q: "15 sind 30 % von …?", a: "G = 15·100/30 = 50."}
          ],
          steps: [
            "Bestimme, welche Größe gesucht ist (G, W oder p).",
            "Setze die bekannten Werte in die passende Formel ein.",
            "Rechne aus und prüfe die Plausibilität."
          ],
          formulas: [
            {name: "Prozentwert", tex: "W = G · p/100"},
            {name: "Prozentsatz", tex: "p% = (W/G) · 100 %"}
          ],
          mistakes: ["Grundwert und Prozentwert verwechseln.","Bei „X % mehr“ den Aufschlag auf den falschen Wert beziehen."],
          exercises: [
            {q: "10 % von 250?", choices: ["25","2,5","250"], answer: 0, solution: "250·10/100 = 25."},
            {q: "50 ist wie viel % von 200?", choices: ["25 %","50 %","4 %"], answer: 0, solution: "50/200·100 = 25 %."},
            {q: "20 sind 40 % von …?", choices: ["50","8","80"], answer: 0, solution: "20·100/40 = 50."}
          ]
        },
        {
          id: "potenzen", title: "Potenzen", icon: "^", level: "Fortgeschritten",
          tags: ["potenzgesetze","exponent","basis"],
          summary: "Potenzgesetze für Multiplikation, Division und Potenzieren.",
          simple: "<p>Eine Potenz <em>aⁿ</em> ist die Kurzschreibweise für „a mal a mal a …“ (n-mal). <em>a</em> ist die Basis, <em>n</em> der Exponent.</p>",
          detailed: "<p>Die <strong>Potenzgesetze</strong>:</p><ul><li>aᵐ·aⁿ = aᵐ⁺ⁿ</li><li>aᵐ:aⁿ = aᵐ⁻ⁿ</li><li>(aᵐ)ⁿ = aᵐ·ⁿ</li><li>a⁰ = 1 (a≠0)</li><li>a⁻ⁿ = 1/aⁿ</li></ul>",
          examples: [
            {q: "2³ · 2² = ?", a: "2³⁺² = 2⁵ = 32."},
            {q: "5⁴ : 5² = ?", a: "5⁴⁻² = 5² = 25."},
            {q: "(3²)³ = ?", a: "3²·³ = 3⁶ = 729."}
          ],
          steps: [
            "Prüfe, ob die Basen gleich sind.",
            "Bei · Exponenten addieren, bei : subtrahieren.",
            "Bei Potenz einer Potenz Exponenten multiplizieren."
          ],
          formulas: [
            {name: "Produkt", tex: "aᵐ · aⁿ = aᵐ⁺ⁿ"},
            {name: "Negativer Exponent", tex: "a⁻ⁿ = 1/aⁿ"}
          ],
          mistakes: ["Bei ungleichen Basen Exponenten addieren (falsch).","2³ als 2·3 = 6 rechnen statt 8."],
          exercises: [
            {q: "3² · 3² = ?", choices: ["3⁴","9⁴","6²"], answer: 0, solution: "Gleiche Basis, Exponenten addieren: 3⁴ = 81."},
            {q: "10⁰ = ?", choices: ["0","1","10"], answer: 1, solution: "Jede Zahl hoch 0 ist 1."},
            {q: "2⁻² = ?", choices: ["1/4","−4","4"], answer: 0, solution: "2⁻² = 1/2² = 1/4."}
          ]
        },
        {
          id: "wurzeln", title: "Wurzeln", icon: "√", level: "Fortgeschritten",
          tags: ["quadratwurzel","radikand","wurzelgesetze"],
          summary: "Quadrat- und n-te Wurzeln, Wurzelgesetze und teilweises Wurzelziehen.",
          simple: "<p>Die Wurzel ist die Umkehrung des Potenzierens. √9 = 3, weil 3² = 9. Die Zahl unter der Wurzel heißt Radikand.</p>",
          detailed: "<p><strong>Wurzelgesetze:</strong></p><ul><li>√(a·b) = √a · √b</li><li>√(a/b) = √a / √b</li><li>ⁿ√a = a^(1/n)</li></ul><p><strong>Teilweises Wurzelziehen:</strong> √50 = √(25·2) = 5√2.</p>",
          examples: [
            {q: "√144 = ?", a: "12, da 12² = 144."},
            {q: "√8 vereinfachen", a: "√(4·2) = 2√2."},
            {q: "√2 · √8 = ?", a: "√16 = 4."}
          ],
          steps: [
            "Zerlege den Radikanden in Quadratzahl · Rest.",
            "Ziehe die Wurzel aus der Quadratzahl.",
            "Schreibe den Rest unter der Wurzel."
          ],
          formulas: [
            {name: "Produktregel", tex: "√(a·b) = √a · √b"},
            {name: "Wurzel als Potenz", tex: "ⁿ√a = a^(1/n)"}
          ],
          mistakes: ["√(a+b) fälschlich als √a+√b schreiben.","Negative Radikanden im Reellen zulassen."],
          exercises: [
            {q: "√49 = ?", choices: ["7","24,5","9"], answer: 0, solution: "7² = 49."},
            {q: "√18 vereinfacht", choices: ["3√2","2√3","9√2"], answer: 0, solution: "√(9·2) = 3√2."},
            {q: "√3 · √12 = ?", choices: ["6","36","√15"], answer: 0, solution: "√36 = 6."}
          ]
        }
      ]
    },

    {
      id: "algebra",
      title: "Algebra",
      icon: "🧮",
      color: "#8b5cf6",
      description: "Gleichungen, Funktionen, Polynome und Logarithmen.",
      topics: [
        {
          id: "gleichungen", title: "Gleichungen", icon: "🟰", level: "Fortgeschritten",
          tags: ["lineare gleichung","äquivalenzumformung","lösen"],
          summary: "Lineare Gleichungen durch Äquivalenzumformungen lösen.",
          simple: "<p>Eine Gleichung hat auf beiden Seiten des =-Zeichens denselben Wert. Ziel ist es, die Variable (z. B. x) allein auf eine Seite zu bringen.</p>",
          detailed: "<p>Mit <strong>Äquivalenzumformungen</strong> bleibt die Lösung gleich: Man darf auf beiden Seiten dasselbe addieren, subtrahieren, multiplizieren oder dividieren (nicht durch 0).</p><p>Ziel: x isolieren. Erst Strich, dann Punkt „rückwärts“ auflösen.</p>",
          examples: [
            {q: "Löse 2x + 3 = 11", a: "−3: 2x = 8; :2: x = 4."},
            {q: "Löse 5x − 7 = 3x + 5", a: "−3x: 2x−7=5; +7: 2x=12; :2: x=6."},
            {q: "Löse x/3 = 4", a: "·3: x = 12."}
          ],
          steps: [
            "Klammern auflösen und zusammenfassen.",
            "Alle x-Terme auf eine Seite bringen.",
            "Alle Zahlen auf die andere Seite bringen.",
            "Durch den Koeffizienten von x teilen."
          ],
          formulas: [{name: "Lineare Gleichung", tex: "ax + b = 0 ⇒ x = −b/a"}],
          mistakes: ["Vorzeichen beim Umstellen vergessen.","Durch 0 dividieren."],
          exercises: [
            {q: "Löse 3x = 12", choices: ["x=4","x=36","x=9"], answer: 0, solution: ":3 ⇒ x = 4."},
            {q: "Löse x + 5 = 2", choices: ["x=7","x=−3","x=3"], answer: 1, solution: "−5 ⇒ x = −3."},
            {q: "Löse 2x − 4 = 10", choices: ["x=7","x=3","x=14"], answer: 0, solution: "+4 ⇒ 2x=14; :2 ⇒ x=7."}
          ]
        },
        {
          id: "ungleichungen", title: "Ungleichungen", icon: "≤", level: "Fortgeschritten",
          tags: ["ungleichung","lösungsmenge","intervall"],
          summary: "Ungleichungen lösen – Achtung beim Multiplizieren mit negativen Zahlen.",
          simple: "<p>Eine Ungleichung vergleicht mit &lt;, &gt;, ≤ oder ≥. Man löst sie ähnlich wie Gleichungen, aber es gibt eine wichtige Sonderregel.</p>",
          detailed: "<p>Regel: Multipliziert oder dividiert man mit einer <strong>negativen Zahl</strong>, <strong>dreht sich das Ungleichheitszeichen um</strong>.</p><p>Die Lösung ist meist ein Intervall, z. B. x &gt; 3.</p>",
          examples: [
            {q: "Löse 2x + 1 < 7", a: "−1: 2x<6; :2: x<3."},
            {q: "Löse −3x > 9", a: ":(−3) und Zeichen drehen: x < −3."},
            {q: "Löse x/2 ≥ 5", a: "·2: x ≥ 10."}
          ],
          steps: ["Wie bei Gleichungen umformen.","Beim Teilen/Multiplizieren mit negativer Zahl das Zeichen umdrehen.","Lösungsmenge als Intervall angeben."],
          formulas: [{name: "Regel", tex: "a < b und c < 0 ⇒ a·c > b·c"}],
          mistakes: ["Zeichen beim Teilen durch negative Zahl nicht drehen."],
          exercises: [
            {q: "Löse x + 2 > 5", choices: ["x>3","x<3","x>7"], answer: 0, solution: "−2 ⇒ x > 3."},
            {q: "Löse −2x < 8", choices: ["x>−4","x<−4","x<4"], answer: 0, solution: ":(−2) drehen ⇒ x > −4."},
            {q: "Löse 3x ≤ 9", choices: ["x≤3","x≥3","x≤27"], answer: 0, solution: ":3 ⇒ x ≤ 3."}
          ]
        },
        {
          id: "lineare-funktionen", title: "Lineare Funktionen", icon: "📈", level: "Fortgeschritten",
          tags: ["gerade","steigung","y-achsenabschnitt"],
          summary: "y = mx + b – Steigung, Achsenabschnitt und Geraden zeichnen.",
          simple: "<p>Eine lineare Funktion ist eine Gerade: <em>y = mx + b</em>. <em>m</em> ist die Steigung, <em>b</em> der Schnittpunkt mit der y-Achse.</p>",
          detailed: "<p><strong>Steigung m</strong> = Δy/Δx. Positiv → steigend, negativ → fallend. <strong>b</strong> ist der y-Wert bei x = 0.</p><p>Nullstelle: x = −b/m.</p>",
          examples: [
            {q: "y = 2x + 1: Steigung & Achsenabschnitt?", a: "m = 2, b = 1."},
            {q: "Nullstelle von y = 2x − 4", a: "0 = 2x−4 ⇒ x = 2."},
            {q: "Steigung durch (0,1) und (2,5)", a: "m = (5−1)/(2−0) = 2."}
          ],
          steps: ["Lies b am y-Achsenabschnitt ab.","Bestimme m über ein Steigungsdreieck.","Zeichne die Gerade durch beide Informationen."],
          formulas: [
            {name: "Geradengleichung", tex: "y = m·x + b"},
            {name: "Steigung", tex: "m = (y₂ − y₁)/(x₂ − x₁)"}
          ],
          mistakes: ["Δx und Δy vertauschen.","Vorzeichen der Steigung falsch bestimmen."],
          exercises: [
            {q: "Steigung von y = −3x + 2?", choices: ["−3","2","3"], answer: 0, solution: "m ist der Faktor vor x: −3."},
            {q: "y-Achsenabschnitt von y = x − 5?", choices: ["5","−5","1"], answer: 1, solution: "b = −5."},
            {q: "Nullstelle von y = x + 4?", choices: ["x=−4","x=4","x=0"], answer: 0, solution: "0 = x+4 ⇒ x = −4."}
          ]
        },
        {
          id: "quadratische-funktionen", title: "Quadratische Funktionen", icon: "🅿️", level: "Fortgeschritten",
          tags: ["parabel","scheitelpunkt","pq-formel","mitternachtsformel"],
          summary: "Parabeln, Scheitelpunkt und Nullstellen mit der pq-/abc-Formel.",
          simple: "<p>Eine quadratische Funktion <em>y = ax² + bx + c</em> ergibt eine <strong>Parabel</strong>. Ihre Nullstellen findet man mit einer Lösungsformel.</p>",
          detailed: "<p><strong>abc-Formel (Mitternachtsformel):</strong> x = (−b ± √(b²−4ac)) / (2a).</p><p>Die <strong>Diskriminante</strong> D = b²−4ac zeigt: D&gt;0 zwei Lösungen, D=0 eine, D&lt;0 keine reelle Lösung.</p><p>Scheitelform: y = a(x−d)² + e mit Scheitel S(d|e).</p>",
          examples: [
            {q: "Nullstellen von x² − 5x + 6", a: "x = (5 ± √(25−24))/2 = (5±1)/2 ⇒ x=3 oder x=2."},
            {q: "Diskriminante von x² + 2x + 5", a: "D = 4 − 20 = −16 < 0 ⇒ keine reelle Nullstelle."},
            {q: "Scheitel von y = (x−2)² + 3", a: "S(2|3)."}
          ],
          steps: ["Bringe die Gleichung in die Form ax²+bx+c = 0.","Berechne die Diskriminante D = b²−4ac.","Setze in die abc-Formel ein.","Werte beide Vorzeichen aus."],
          formulas: [
            {name: "abc-Formel", tex: "x = (−b ± √(b²−4ac)) / (2a)"},
            {name: "pq-Formel", tex: "x = −p/2 ± √((p/2)² − q)"}
          ],
          mistakes: ["Vorzeichen von b in der Formel vergessen.","D < 0 als Fehler statt „keine reelle Lösung“ deuten."],
          exercises: [
            {q: "Nullstellen von x² − 4 = 0?", choices: ["±2","4","±4"], answer: 0, solution: "x² = 4 ⇒ x = ±2."},
            {q: "Wie viele Lösungen bei D = 0?", choices: ["0","1","2"], answer: 1, solution: "D = 0 ⇒ genau eine (doppelte) Lösung."},
            {q: "Scheitel von y = x²?", choices: ["(0|0)","(1|1)","(0|1)"], answer: 0, solution: "Normalparabel: S(0|0)."}
          ]
        },
        {
          id: "polynome", title: "Polynome", icon: "🧾", level: "Experte",
          tags: ["polynom","grad","polynomdivision"],
          summary: "Ganzrationale Funktionen, Grad und Polynomdivision.",
          simple: "<p>Ein Polynom ist eine Summe aus Potenzen von x mit Koeffizienten, z. B. 2x³ − x + 4. Der höchste Exponent ist der <strong>Grad</strong>.</p>",
          detailed: "<p>Polynome vom Grad n haben höchstens n Nullstellen. Mit <strong>Polynomdivision</strong> kann man einen bekannten Linearfaktor (x−x₀) abspalten und den Grad reduzieren.</p>",
          examples: [
            {q: "Grad von 3x⁴ − 2x + 1?", a: "4 (höchster Exponent)."},
            {q: "(x²−1):(x−1)", a: "= x + 1 (da x²−1 = (x−1)(x+1))."},
            {q: "Nullstelle von x³ − x?", a: "x(x²−1)=0 ⇒ x=0, ±1."}
          ],
          steps: ["Rate/finde eine Nullstelle x₀.","Führe Polynomdivision durch (x−x₀) aus.","Löse das Restpolynom weiter."],
          formulas: [{name: "Faktorisierung", tex: "p(x) = (x − x₀)·q(x)"}],
          mistakes: ["Beim Dividieren fehlende Terme (Grad-Lücken) nicht mit 0 auffüllen."],
          exercises: [
            {q: "Grad von x⁵ + x²?", choices: ["2","5","7"], answer: 1, solution: "Höchster Exponent 5."},
            {q: "Nullstelle von x²−9?", choices: ["±3","9","3"], answer: 0, solution: "x=±3."},
            {q: "(x²+2x):x = ?", choices: ["x+2","x²","2"], answer: 0, solution: "Jeden Term durch x teilen: x+2."}
          ]
        },
        {
          id: "faktorisierung", title: "Faktorisierung", icon: "✳️", level: "Fortgeschritten",
          tags: ["ausklammern","binomische formeln","faktor"],
          summary: "Ausklammern und binomische Formeln zum Zerlegen von Termen.",
          simple: "<p>Faktorisieren heißt, eine Summe als Produkt zu schreiben. Das hilft beim Kürzen und Lösen von Gleichungen.</p>",
          detailed: "<p>Methoden: <strong>Ausklammern</strong> gemeinsamer Faktoren, <strong>binomische Formeln</strong> rückwärts, und Faktorisieren über Nullstellen.</p><p>Binomische Formeln: (a+b)² = a²+2ab+b²; (a−b)² = a²−2ab+b²; (a+b)(a−b) = a²−b².</p>",
          examples: [
            {q: "Faktorisiere 6x + 9", a: "3(2x + 3)."},
            {q: "Faktorisiere x² − 16", a: "(x−4)(x+4)."},
            {q: "Faktorisiere x² + 6x + 9", a: "(x+3)²."}
          ],
          steps: ["Suche einen gemeinsamen Faktor zum Ausklammern.","Prüfe, ob eine binomische Formel passt.","Zerlege ggf. über bekannte Nullstellen."],
          formulas: [
            {name: "3. binomische Formel", tex: "a² − b² = (a+b)(a−b)"},
            {name: "1. binomische Formel", tex: "(a+b)² = a² + 2ab + b²"}
          ],
          mistakes: ["Bei a²−b² fälschlich (a−b)² schreiben.","Nur teilweise ausklammern."],
          exercises: [
            {q: "Faktorisiere 4x + 8", choices: ["4(x+2)","2(2x+8)","4x+8"], answer: 0, solution: "Gemeinsamer Faktor 4: 4(x+2)."},
            {q: "x²−25 = ?", choices: ["(x−5)(x+5)","(x−5)²","(x+25)"], answer: 0, solution: "3. binomische Formel."},
            {q: "x²+4x+4 = ?", choices: ["(x+2)²","(x−2)²","(x+4)²"], answer: 0, solution: "1. binomische Formel."}
          ]
        },
        {
          id: "logarithmen", title: "Logarithmen", icon: "㏒", level: "Experte",
          tags: ["logarithmus","log","exponentialgleichung"],
          summary: "Der Logarithmus als Umkehrung der Potenz und seine Rechengesetze.",
          simple: "<p>Der Logarithmus beantwortet die Frage: „Mit welchem Exponenten muss ich die Basis potenzieren?“ log₂8 = 3, weil 2³ = 8.</p>",
          detailed: "<p><strong>Logarithmusgesetze:</strong></p><ul><li>log(a·b) = log a + log b</li><li>log(a/b) = log a − log b</li><li>log(aⁿ) = n·log a</li></ul><p>Damit löst man Exponentialgleichungen wie 2ˣ = 8.</p>",
          examples: [
            {q: "log₁₀ 1000 = ?", a: "3, da 10³ = 1000."},
            {q: "Löse 2ˣ = 16", a: "x = log₂16 = 4."},
            {q: "log 100 + log 10 = ?", a: "log 1000 = 3."}
          ],
          steps: ["Schreibe die Exponentialgleichung als aˣ = b.","Wende den Logarithmus auf beide Seiten an.","Nutze log(aˣ)=x·log a und stelle nach x um."],
          formulas: [
            {name: "Definition", tex: "log_a(b) = x ⟺ aˣ = b"},
            {name: "Produktgesetz", tex: "log(a·b) = log a + log b"}
          ],
          mistakes: ["log(a+b) mit log a + log b verwechseln.","Basis vergessen anzugeben."],
          exercises: [
            {q: "log₂ 32 = ?", choices: ["5","4","6"], answer: 0, solution: "2⁵ = 32."},
            {q: "log₁₀ 1 = ?", choices: ["0","1","10"], answer: 0, solution: "10⁰ = 1."},
            {q: "Löse 3ˣ = 27", choices: ["x=3","x=9","x=27"], answer: 0, solution: "3³ = 27 ⇒ x = 3."}
          ]
        }
      ]
    },

    {
      id: "geometrie",
      title: "Geometrie",
      icon: "📐",
      color: "#ec4899",
      description: "Formen, Flächen, Volumen und der Satz des Pythagoras.",
      topics: [
        {
          id: "dreiecke", title: "Dreiecke", icon: "🔺", level: "Anfänger",
          tags: ["dreieck","winkelsumme","fläche"],
          summary: "Arten, Winkelsumme (180°) und Flächenberechnung von Dreiecken.",
          simple: "<p>Ein Dreieck hat drei Ecken und drei Seiten. Die Summe der Innenwinkel beträgt immer <strong>180°</strong>.</p>",
          detailed: "<p>Arten: gleichseitig, gleichschenklig, rechtwinklig. <strong>Fläche</strong> A = ½·g·h (Grundseite mal Höhe durch zwei).</p>",
          examples: [
            {q: "Zwei Winkel sind 50° und 60°. Der dritte?", a: "180 − 50 − 60 = 70°."},
            {q: "Fläche bei g = 6, h = 4", a: "A = ½·6·4 = 12."},
            {q: "Ist ein Dreieck mit 90°,45°,45° rechtwinklig?", a: "Ja, es hat einen 90°-Winkel."}
          ],
          steps: ["Grundseite g und zugehörige Höhe h bestimmen.","In A = ½·g·h einsetzen.","Ergebnis mit Einheit angeben."],
          formulas: [
            {name: "Fläche", tex: "A = ½ · g · h"},
            {name: "Winkelsumme", tex: "α + β + γ = 180°"}
          ],
          mistakes: ["Höhe mit Seitenlänge verwechseln.","Faktor ½ vergessen."],
          exercises: [
            {q: "Winkelsumme im Dreieck?", choices: ["180°","360°","90°"], answer: 0, solution: "Immer 180°."},
            {q: "Fläche bei g=10, h=3?", choices: ["15","30","13"], answer: 0, solution: "½·10·3 = 15."},
            {q: "Dritter Winkel bei 90° und 30°?", choices: ["60°","70°","90°"], answer: 0, solution: "180−90−30 = 60°."}
          ]
        },
        {
          id: "kreise", title: "Kreise", icon: "⭕", level: "Anfänger",
          tags: ["kreis","umfang","pi","radius"],
          summary: "Umfang und Fläche des Kreises mit π.",
          simple: "<p>Ein Kreis ist durch seinen <strong>Radius r</strong> bestimmt. Mit der Kreiszahl π ≈ 3,14159 berechnet man Umfang und Fläche.</p>",
          detailed: "<p><strong>Umfang:</strong> U = 2πr. <strong>Fläche:</strong> A = πr². Der Durchmesser ist d = 2r.</p>",
          examples: [
            {q: "Umfang bei r = 5", a: "U = 2π·5 ≈ 31,4."},
            {q: "Fläche bei r = 3", a: "A = π·9 ≈ 28,3."},
            {q: "Durchmesser bei r = 7", a: "d = 14."}
          ],
          steps: ["Radius r bestimmen (ggf. d/2).","Für Umfang 2πr, für Fläche πr² einsetzen.","Mit π ≈ 3,14159 auswerten."],
          formulas: [
            {name: "Umfang", tex: "U = 2·π·r"},
            {name: "Fläche", tex: "A = π·r²"}
          ],
          mistakes: ["Fläche mit U = 2πr statt A = πr² berechnen.","Durchmesser statt Radius einsetzen."],
          exercises: [
            {q: "Fläche bei r = 2 (π≈3,14)?", choices: ["12,56","6,28","4"], answer: 0, solution: "π·4 ≈ 12,56."},
            {q: "Umfang bei r = 1 (π≈3,14)?", choices: ["6,28","3,14","1"], answer: 0, solution: "2π·1 ≈ 6,28."},
            {q: "d bei r = 10?", choices: ["20","5","100"], answer: 0, solution: "d = 2r = 20."}
          ]
        },
        {
          id: "vierecke", title: "Vierecke", icon: "⬜", level: "Anfänger",
          tags: ["quadrat","rechteck","parallelogramm","trapez"],
          summary: "Quadrat, Rechteck, Parallelogramm und Trapez mit Flächenformeln.",
          simple: "<p>Vierecke haben vier Ecken. Wichtige Typen sind Quadrat, Rechteck, Parallelogramm und Trapez – jeder mit eigener Flächenformel.</p>",
          detailed: "<p>Rechteck A = a·b · · · Quadrat A = a² · · · Parallelogramm A = g·h · · · Trapez A = ½(a+c)·h. Winkelsumme im Viereck: 360°.</p>",
          examples: [
            {q: "Fläche Rechteck a=5, b=3", a: "A = 15."},
            {q: "Fläche Quadrat a=4", a: "A = 16."},
            {q: "Fläche Trapez a=6, c=4, h=2", a: "A = ½(6+4)·2 = 10."}
          ],
          steps: ["Viereckstyp bestimmen.","Passende Formel wählen.","Werte einsetzen und ausrechnen."],
          formulas: [
            {name: "Rechteck", tex: "A = a · b"},
            {name: "Trapez", tex: "A = ½ · (a + c) · h"}
          ],
          mistakes: ["Parallelogrammfläche mit Seitenlänge statt Höhe rechnen."],
          exercises: [
            {q: "Fläche Quadrat a=6?", choices: ["36","24","12"], answer: 0, solution: "6² = 36."},
            {q: "Winkelsumme im Viereck?", choices: ["360°","180°","270°"], answer: 0, solution: "Immer 360°."},
            {q: "Fläche Rechteck 8×2?", choices: ["16","10","20"], answer: 0, solution: "8·2 = 16."}
          ]
        },
        {
          id: "flaechenberechnung", title: "Flächenberechnung", icon: "🟦", level: "Anfänger",
          tags: ["fläche","flächeninhalt","zusammengesetzt"],
          summary: "Flächen von Grundformen und zusammengesetzten Figuren.",
          simple: "<p>Der Flächeninhalt sagt, wie viel Platz eine Figur einnimmt (in cm², m² …). Zusammengesetzte Flächen zerlegt man in bekannte Formen.</p>",
          detailed: "<p>Strategie bei komplexen Figuren: in Rechtecke, Dreiecke und Kreise zerlegen, Teilflächen berechnen und addieren (oder abziehen).</p>",
          examples: [
            {q: "L-Form aus 4×4 minus 2×2", a: "16 − 4 = 12."},
            {q: "Halbkreis r=2 (π≈3,14)", a: "½·π·4 ≈ 6,28."},
            {q: "Rechteck 5×3 plus Dreieck ½·5·2", a: "15 + 5 = 20."}
          ],
          steps: ["Figur in bekannte Teilflächen zerlegen.","Teilflächen einzeln berechnen.","Addieren bzw. subtrahieren."],
          formulas: [{name: "Zerlegung", tex: "A = A₁ + A₂ + … (− Aussparungen)"}],
          mistakes: ["Einheiten mischen (cm mit m).","Aussparungen vergessen abzuziehen."],
          exercises: [
            {q: "Fläche 3×3 plus 3×1?", choices: ["12","9","6"], answer: 0, solution: "9 + 3 = 12."},
            {q: "Einheit einer Fläche?", choices: ["m²","m","m³"], answer: 0, solution: "Fläche in Quadrateinheiten."},
            {q: "Rechteck 10×10 minus 5×5?", choices: ["75","100","50"], answer: 0, solution: "100 − 25 = 75."}
          ]
        },
        {
          id: "volumenberechnung", title: "Volumenberechnung", icon: "🧊", level: "Fortgeschritten",
          tags: ["volumen","würfel","zylinder","kugel"],
          summary: "Volumen von Würfel, Quader, Zylinder, Kegel und Kugel.",
          simple: "<p>Das Volumen sagt, wie viel Raum ein Körper einnimmt (cm³, m³ …). Jeder Körper hat seine eigene Formel.</p>",
          detailed: "<p>Würfel V = a³ · Quader V = a·b·c · Zylinder V = πr²h · Kegel V = ⅓πr²h · Kugel V = ⁴⁄₃πr³.</p>",
          examples: [
            {q: "Würfel a=3", a: "V = 27."},
            {q: "Zylinder r=2, h=5 (π≈3,14)", a: "V = π·4·5 ≈ 62,8."},
            {q: "Quader 2×3×4", a: "V = 24."}
          ],
          steps: ["Körpertyp erkennen.","Passende Volumenformel wählen.","Werte einsetzen (r, h, a).","Mit Einheit ³ angeben."],
          formulas: [
            {name: "Zylinder", tex: "V = π·r²·h"},
            {name: "Kugel", tex: "V = ⁴⁄₃·π·r³"}
          ],
          mistakes: ["Fläche statt Volumen berechnen.","Bei Kegel Faktor ⅓ vergessen."],
          exercises: [
            {q: "Würfel a=2, V=?", choices: ["8","6","4"], answer: 0, solution: "2³ = 8."},
            {q: "Quader 1×2×3?", choices: ["6","5","9"], answer: 0, solution: "1·2·3 = 6."},
            {q: "Einheit des Volumens?", choices: ["m³","m²","m"], answer: 0, solution: "Kubikeinheiten."}
          ]
        },
        {
          id: "pythagoras", title: "Satz des Pythagoras", icon: "📐", level: "Fortgeschritten",
          tags: ["pythagoras","hypotenuse","katheten","rechtwinklig"],
          summary: "a² + b² = c² im rechtwinkligen Dreieck.",
          simple: "<p>Im rechtwinkligen Dreieck gilt: Die Summe der Quadrate der beiden kurzen Seiten (Katheten) ist gleich dem Quadrat der längsten Seite (Hypotenuse).</p>",
          detailed: "<p><strong>a² + b² = c²</strong>, wobei c die Hypotenuse (gegenüber dem rechten Winkel) ist. Damit berechnet man fehlende Seiten oder prüft Rechtwinkligkeit.</p>",
          examples: [
            {q: "a=3, b=4, c=?", a: "c = √(9+16) = √25 = 5."},
            {q: "c=13, a=5, b=?", a: "b = √(169−25) = √144 = 12."},
            {q: "Ist 6,8,10 rechtwinklig?", a: "36+64=100=10² ✓ ja."}
          ],
          steps: ["Rechten Winkel identifizieren, Hypotenuse c benennen.","Bekannte Seiten in a²+b²=c² einsetzen.","Nach der gesuchten Seite umstellen und Wurzel ziehen."],
          formulas: [{name: "Satz des Pythagoras", tex: "a² + b² = c²"}],
          mistakes: ["Hypotenuse mit Kathete verwechseln.","√ am Ende vergessen."],
          exercises: [
            {q: "a=6,b=8,c=?", choices: ["10","14","12"], answer: 0, solution: "√(36+64)=√100=10."},
            {q: "Welche Seite ist c?", choices: ["die längste","die kürzeste","egal"], answer: 0, solution: "Hypotenuse = längste Seite."},
            {q: "a=9,b=12,c=?", choices: ["15","21","13"], answer: 0, solution: "√(81+144)=√225=15."}
          ]
        },
        {
          id: "analytische-geometrie", title: "Analytische Geometrie", icon: "🧭", level: "Experte",
          tags: ["koordinaten","abstand","mittelpunkt","gerade"],
          summary: "Punkte, Abstände, Mittelpunkte und Geraden im Koordinatensystem.",
          simple: "<p>In der analytischen Geometrie beschreibt man Punkte und Figuren mit Koordinaten (x|y) und rechnet mit Formeln statt zu zeichnen.</p>",
          detailed: "<p><strong>Abstand:</strong> d = √((x₂−x₁)² + (y₂−y₁)²). <strong>Mittelpunkt:</strong> M = ((x₁+x₂)/2 | (y₁+y₂)/2).</p>",
          examples: [
            {q: "Abstand A(0,0) B(3,4)", a: "√(9+16) = 5."},
            {q: "Mittelpunkt A(2,2) B(4,6)", a: "M(3|4)."},
            {q: "Abstand A(1,1) B(1,5)", a: "√(0+16) = 4."}
          ],
          steps: ["Koordinaten der Punkte notieren.","Differenzen Δx, Δy bilden.","In die Abstands-/Mittelpunktsformel einsetzen."],
          formulas: [
            {name: "Abstand", tex: "d = √((x₂−x₁)² + (y₂−y₁)²)"},
            {name: "Mittelpunkt", tex: "M = ((x₁+x₂)/2 | (y₁+y₂)/2)"}
          ],
          mistakes: ["Vorzeichen bei Differenzen falsch.","Wurzel vergessen."],
          exercises: [
            {q: "Abstand (0,0)-(0,3)?", choices: ["3","9","√3"], answer: 0, solution: "√(0+9)=3."},
            {q: "Mittelpunkt (0,0)-(4,0)?", choices: ["(2|0)","(4|0)","(0|2)"], answer: 0, solution: "((0+4)/2|0)=(2|0)."},
            {q: "Abstand (1,2)-(4,6)?", choices: ["5","7","3"], answer: 0, solution: "√(9+16)=5."}
          ]
        }
      ]
    },

    {
      id: "trigonometrie",
      title: "Trigonometrie",
      icon: "📡",
      color: "#f59e0b",
      description: "Sinus, Kosinus, Tangens und Winkelberechnungen.",
      topics: [
        {
          id: "sinus", title: "Sinus", icon: "〰️", level: "Fortgeschritten",
          tags: ["sinus","gegenkathete","hypotenuse"],
          summary: "sin = Gegenkathete / Hypotenuse im rechtwinkligen Dreieck.",
          simple: "<p>Der Sinus eines Winkels ist das Verhältnis von Gegenkathete zur Hypotenuse. Damit berechnet man Seiten und Winkel.</p>",
          detailed: "<p><strong>sin(α) = Gegenkathete / Hypotenuse.</strong> Der Wertebereich ist −1 bis 1. Wichtige Werte: sin 0° = 0, sin 30° = 0,5, sin 90° = 1.</p>",
          examples: [
            {q: "sin 30°", a: "0,5."},
            {q: "Gegenkathete bei c=10, α=30°", a: "10·sin30° = 5."},
            {q: "sin 90°", a: "1."}
          ],
          steps: ["Gegenkathete und Hypotenuse identifizieren.","sin(α) = Gegenkathete/Hypotenuse aufstellen.","Nach gesuchter Größe umstellen."],
          formulas: [{name: "Sinus", tex: "sin(α) = Gegenkathete / Hypotenuse"}],
          mistakes: ["Gegen- und Ankathete verwechseln.","Taschenrechner im falschen Modus (Grad/Bogenmaß)."],
          exercises: [
            {q: "sin 0° = ?", choices: ["0","1","0,5"], answer: 0, solution: "sin 0° = 0."},
            {q: "sin 90° = ?", choices: ["1","0","−1"], answer: 0, solution: "sin 90° = 1."},
            {q: "sin 30° = ?", choices: ["0,5","1","0,87"], answer: 0, solution: "sin 30° = 0,5."}
          ]
        },
        {
          id: "kosinus", title: "Kosinus", icon: "📉", level: "Fortgeschritten",
          tags: ["kosinus","ankathete","hypotenuse"],
          summary: "cos = Ankathete / Hypotenuse.",
          simple: "<p>Der Kosinus ist das Verhältnis von Ankathete zur Hypotenuse.</p>",
          detailed: "<p><strong>cos(α) = Ankathete / Hypotenuse.</strong> cos 0° = 1, cos 60° = 0,5, cos 90° = 0. Es gilt sin²α + cos²α = 1.</p>",
          examples: [
            {q: "cos 0°", a: "1."},
            {q: "Ankathete bei c=10, α=60°", a: "10·cos60° = 5."},
            {q: "cos 90°", a: "0."}
          ],
          steps: ["Ankathete und Hypotenuse identifizieren.","cos(α)=Ankathete/Hypotenuse.","Umstellen und berechnen."],
          formulas: [
            {name: "Kosinus", tex: "cos(α) = Ankathete / Hypotenuse"},
            {name: "Trig. Pythagoras", tex: "sin²α + cos²α = 1"}
          ],
          mistakes: ["cos und sin vertauschen."],
          exercises: [
            {q: "cos 0° = ?", choices: ["1","0","0,5"], answer: 0, solution: "cos 0° = 1."},
            {q: "cos 90° = ?", choices: ["0","1","−1"], answer: 0, solution: "cos 90° = 0."},
            {q: "cos 60° = ?", choices: ["0,5","0,87","1"], answer: 0, solution: "cos 60° = 0,5."}
          ]
        },
        {
          id: "tangens", title: "Tangens", icon: "📐", level: "Fortgeschritten",
          tags: ["tangens","gegenkathete","ankathete"],
          summary: "tan = Gegenkathete / Ankathete = sin/cos.",
          simple: "<p>Der Tangens ist das Verhältnis von Gegenkathete zu Ankathete – oder sin geteilt durch cos.</p>",
          detailed: "<p><strong>tan(α) = Gegenkathete / Ankathete = sin α / cos α.</strong> tan 0° = 0, tan 45° = 1, tan 90° ist nicht definiert.</p>",
          examples: [
            {q: "tan 45°", a: "1."},
            {q: "tan 0°", a: "0."},
            {q: "Steigungswinkel bei m=1", a: "α = arctan 1 = 45°."}
          ],
          steps: ["Gegen- und Ankathete bestimmen.","tan(α)=Gegen/An aufstellen.","Für Winkel arctan verwenden."],
          formulas: [{name: "Tangens", tex: "tan(α) = sin α / cos α"}],
          mistakes: ["tan 90° als Zahl angeben (nicht definiert).","Verhältnis umdrehen."],
          exercises: [
            {q: "tan 45° = ?", choices: ["1","0","∞"], answer: 0, solution: "tan 45° = 1."},
            {q: "tan 0° = ?", choices: ["0","1","−1"], answer: 0, solution: "tan 0° = 0."},
            {q: "tan = sin / ?", choices: ["cos","tan","1"], answer: 0, solution: "tan = sin/cos."}
          ]
        },
        {
          id: "winkelberechnungen", title: "Winkelberechnungen", icon: "📏", level: "Fortgeschritten",
          tags: ["winkel","arcus","umkehrfunktion"],
          summary: "Winkel aus Seitenverhältnissen mit arcsin, arccos, arctan.",
          simple: "<p>Kennt man zwei Seiten, findet man den Winkel mit den Umkehrfunktionen sin⁻¹, cos⁻¹, tan⁻¹ (arcsin usw.).</p>",
          detailed: "<p>Beispiel: sin α = 0,5 ⇒ α = arcsin(0,5) = 30°. Achte auf den Taschenrechner-Modus (DEG). Winkelsumme im Dreieck weiterhin 180°.</p>",
          examples: [
            {q: "sin α = 0,5, α?", a: "arcsin 0,5 = 30°."},
            {q: "tan α = 1, α?", a: "arctan 1 = 45°."},
            {q: "cos α = 1, α?", a: "arccos 1 = 0°."}
          ],
          steps: ["Passendes Verhältnis (sin/cos/tan) wählen.","Umkehrfunktion anwenden.","Winkel im richtigen Modus ablesen."],
          formulas: [{name: "Umkehrung", tex: "α = arcsin(Gegenkathete/Hypotenuse)"}],
          mistakes: ["Taschenrechner in RAD statt DEG.","Falsche Umkehrfunktion wählen."],
          exercises: [
            {q: "arcsin(1) = ?", choices: ["90°","0°","45°"], answer: 0, solution: "sin 90° = 1."},
            {q: "arctan(1) = ?", choices: ["45°","30°","60°"], answer: 0, solution: "tan 45° = 1."},
            {q: "arccos(0) = ?", choices: ["90°","0°","180°"], answer: 0, solution: "cos 90° = 0."}
          ]
        },
        {
          id: "trig-anwendungen", title: "Anwendungen", icon: "🗼", level: "Experte",
          tags: ["höhenmessung","steigung","anwendung"],
          summary: "Trigonometrie in Höhenmessung, Navigation und Technik.",
          simple: "<p>Mit Sinus, Kosinus und Tangens kann man Höhen von Türmen, Entfernungen oder Steigungen berechnen, ohne sie direkt zu messen.</p>",
          detailed: "<p>Typische Aufgabe: Von einem Punkt aus misst man den Höhenwinkel α und die Entfernung d zum Fußpunkt. Höhe h = d·tan α.</p>",
          examples: [
            {q: "d=50m, α=30°, Höhe?", a: "h = 50·tan30° ≈ 28,9 m."},
            {q: "Steigung 100 %, Winkel?", a: "arctan 1 = 45°."},
            {q: "Rampe h=2, l=10, Winkel?", a: "arcsin(2/10) ≈ 11,5°."}
          ],
          steps: ["Skizze mit rechtem Winkel anfertigen.","Bekannte Größen zuordnen.","Passende Trig-Funktion wählen und lösen."],
          formulas: [{name: "Höhe", tex: "h = d · tan α"}],
          mistakes: ["Höhen- und Tiefenwinkel verwechseln.","Falsche Seite als Bezug wählen."],
          exercises: [
            {q: "h=d·tan α ist für …", choices: ["Höhenmessung","Fläche","Volumen"], answer: 0, solution: "Höhe aus Winkel und Entfernung."},
            {q: "Steigung 100 % entspricht", choices: ["45°","90°","30°"], answer: 0, solution: "tan 45° = 1 = 100 %."},
            {q: "d=10, α=45°, h?", choices: ["10","5","14"], answer: 0, solution: "10·tan45° = 10."}
          ]
        }
      ]
    },

    {
      id: "analysis",
      title: "Analysis",
      icon: "∫",
      color: "#10b981",
      description: "Funktionen, Ableitungen, Integrale und Kurvendiskussion.",
      topics: [
        {
          id: "funktionen", title: "Funktionen", icon: "ƒ", level: "Fortgeschritten",
          tags: ["funktion","definitionsbereich","wertebereich"],
          summary: "Zuordnungen, Definitions- und Wertebereich, Funktionstypen.",
          simple: "<p>Eine Funktion ordnet jedem x genau einen y-Wert zu. Man schreibt f(x). Der Graph zeigt diese Zuordnung im Koordinatensystem.</p>",
          detailed: "<p><strong>Definitionsbereich</strong>: erlaubte x-Werte. <strong>Wertebereich</strong>: erreichbare y-Werte. Wichtige Typen: linear, quadratisch, exponentiell, trigonometrisch.</p>",
          examples: [
            {q: "f(x)=x², f(3)=?", a: "9."},
            {q: "Definitionsbereich von 1/x?", a: "ℝ ohne 0."},
            {q: "f(x)=2x+1, f(0)=?", a: "1."}
          ],
          steps: ["x-Wert in f(x) einsetzen.","Term ausrechnen.","Bei Definitionslücken (Nenner=0) ausschließen."],
          formulas: [{name: "Funktionswert", tex: "y = f(x)"}],
          mistakes: ["Definitionslücken übersehen.","x und y vertauschen."],
          exercises: [
            {q: "f(x)=x+2, f(5)=?", choices: ["7","10","5"], answer: 0, solution: "5+2 = 7."},
            {q: "Def.-bereich von √x?", choices: ["x≥0","alle x","x>0"], answer: 0, solution: "Radikand ≥ 0."},
            {q: "f(x)=3x, f(2)=?", choices: ["6","5","9"], answer: 0, solution: "3·2 = 6."}
          ]
        },
        {
          id: "ableitungen", title: "Ableitungen", icon: "′", level: "Experte",
          tags: ["ableitung","differenzieren","steigung"],
          summary: "Die Ableitung f'(x) als Steigung – Regeln zum Differenzieren.",
          simple: "<p>Die Ableitung gibt die momentane Steigung einer Funktion an jeder Stelle an. Sie ist zentral für die Kurvendiskussion.</p>",
          detailed: "<p><strong>Potenzregel:</strong> f(x)=xⁿ ⇒ f'(x)=n·xⁿ⁻¹. <strong>Faktorregel, Summenregel, Produkt- und Kettenregel</strong> erweitern das. f'(x)&gt;0 bedeutet steigend.</p>",
          examples: [
            {q: "f(x)=x³, f'(x)=?", a: "3x²."},
            {q: "f(x)=5x², f'(x)=?", a: "10x."},
            {q: "f(x)=x²+3x, f'(x)=?", a: "2x+3."}
          ],
          steps: ["Jeden Summanden einzeln ableiten.","Potenzregel n·xⁿ⁻¹ anwenden.","Konstante fällt weg (Ableitung 0)."],
          formulas: [
            {name: "Potenzregel", tex: "(xⁿ)' = n·xⁿ⁻¹"},
            {name: "Kettenregel", tex: "(f(g(x)))' = f'(g)·g'"}
          ],
          mistakes: ["Konstante nicht wegfallen lassen.","Exponent nicht um 1 verringern."],
          exercises: [
            {q: "f(x)=x², f'(x)=?", choices: ["2x","x","2"], answer: 0, solution: "2·x¹ = 2x."},
            {q: "f(x)=7, f'(x)=?", choices: ["0","7","1"], answer: 0, solution: "Konstante ⇒ 0."},
            {q: "f(x)=4x, f'(x)=?", choices: ["4","4x","0"], answer: 0, solution: "Steigung 4."}
          ]
        },
        {
          id: "integrale", title: "Integrale", icon: "∫", level: "Experte",
          tags: ["integral","stammfunktion","fläche"],
          summary: "Stammfunktionen und Flächen unter Kurven.",
          simple: "<p>Das Integrieren ist die Umkehrung des Ableitens. Das bestimmte Integral berechnet die Fläche zwischen Kurve und x-Achse.</p>",
          detailed: "<p><strong>Potenzregel:</strong> ∫xⁿ dx = xⁿ⁺¹/(n+1) + C. Das bestimmte Integral: ∫ₐᵇ f dx = F(b) − F(a) (Hauptsatz der Analysis).</p>",
          examples: [
            {q: "∫ 2x dx", a: "x² + C."},
            {q: "∫₀¹ x dx", a: "[x²/2]₀¹ = 1/2."},
            {q: "∫ x² dx", a: "x³/3 + C."}
          ],
          steps: ["Stammfunktion F bilden (Exponent +1, dann teilen).","Grenzen einsetzen: F(b) − F(a).","Bei unbestimmtem Integral +C."],
          formulas: [
            {name: "Potenzregel", tex: "∫xⁿ dx = xⁿ⁺¹/(n+1) + C"},
            {name: "Hauptsatz", tex: "∫ₐᵇ f dx = F(b) − F(a)"}
          ],
          mistakes: ["+C beim unbestimmten Integral vergessen.","Grenzen vertauschen."],
          exercises: [
            {q: "∫ 1 dx = ?", choices: ["x + C","1 + C","0"], answer: 0, solution: "Stammfunktion von 1 ist x."},
            {q: "∫ x dx = ?", choices: ["x²/2 + C","x²","1"], answer: 0, solution: "x²/2 + C."},
            {q: "∫₀² 1 dx = ?", choices: ["2","0","1"], answer: 0, solution: "[x]₀² = 2."}
          ]
        },
        {
          id: "grenzwerte", title: "Grenzwerte", icon: "→", level: "Experte",
          tags: ["grenzwert","limes","stetigkeit"],
          summary: "Verhalten von Funktionen an Rändern und Definitionslücken.",
          simple: "<p>Ein Grenzwert beschreibt, welchem Wert eine Funktion sich nähert, wenn x gegen eine Zahl oder gegen unendlich geht.</p>",
          detailed: "<p>Schreibweise: lim(x→a) f(x). Grenzwerte helfen bei Stetigkeit, Asymptoten und der Definition der Ableitung.</p>",
          examples: [
            {q: "lim(x→2) (x+1)", a: "3."},
            {q: "lim(x→∞) 1/x", a: "0."},
            {q: "lim(x→0) x²", a: "0."}
          ],
          steps: ["Setze den Grenzwert ein, wenn möglich.","Bei 0/0 umformen/kürzen.","Verhalten gegen ∞ über höchste Potenz bewerten."],
          formulas: [{name: "Schreibweise", tex: "lim(x→a) f(x) = L"}],
          mistakes: ["0/0 als Endergebnis stehen lassen.","Einseitige Grenzwerte ignorieren."],
          exercises: [
            {q: "lim(x→∞) 1/x = ?", choices: ["0","∞","1"], answer: 0, solution: "1/x wird beliebig klein."},
            {q: "lim(x→3) x = ?", choices: ["3","0","∞"], answer: 0, solution: "Einfach einsetzen: 3."},
            {q: "lim(x→0) (x+5) = ?", choices: ["5","0","∞"], answer: 0, solution: "0+5 = 5."}
          ]
        },
        {
          id: "kurvendiskussion", title: "Kurvendiskussion", icon: "🔍", level: "Experte",
          tags: ["kurvendiskussion","extrema","wendepunkt","monotonie"],
          summary: "Nullstellen, Extrempunkte, Wendepunkte und Monotonie systematisch.",
          simple: "<p>Bei der Kurvendiskussion untersucht man eine Funktion vollständig: Nullstellen, Hoch- und Tiefpunkte, Wendepunkte und Verlauf.</p>",
          detailed: "<p>Schema: 1) Nullstellen f(x)=0. 2) Extrema f'(x)=0 und f''≠0. 3) Wendepunkte f''(x)=0. 4) Monotonie über Vorzeichen von f'.</p>",
          examples: [
            {q: "Extremstelle von f(x)=x²", a: "f'=2x=0 ⇒ x=0 (Minimum)."},
            {q: "Nullstellen von x²−1", a: "x = ±1."},
            {q: "f''(x) für f=x³?", a: "f''=6x, Wendepunkt bei x=0."}
          ],
          steps: ["Nullstellen: f(x)=0 lösen.","Extrema: f'(x)=0, mit f'' prüfen.","Wendepunkte: f''(x)=0.","Verhalten und Skizze zusammenfassen."],
          formulas: [
            {name: "Extremum", tex: "f'(x)=0 und f''(x)≠0"},
            {name: "Wendepunkt", tex: "f''(x)=0 und f'''(x)≠0"}
          ],
          mistakes: ["Notwendige mit hinreichender Bedingung verwechseln.","f'' zur Art des Extremums nicht prüfen."],
          exercises: [
            {q: "Extremum bei f'(x)=?", choices: ["0","1","∞"], answer: 0, solution: "Notwendig: f'(x)=0."},
            {q: "Wendepunkt bei f''(x)=?", choices: ["0","1","−1"], answer: 0, solution: "f''(x)=0."},
            {q: "Min oder Max bei f''>0?", choices: ["Minimum","Maximum","Wende"], answer: 0, solution: "f''>0 ⇒ Linkskrümmung ⇒ Minimum."}
          ]
        },
        {
          id: "extremwerte", title: "Extremwerte", icon: "⛰️", level: "Experte",
          tags: ["extremwert","optimierung","maximum","minimum"],
          summary: "Optimierungsaufgaben: größtes/kleinstes Ergebnis finden.",
          simple: "<p>Bei Extremwertaufgaben sucht man das Maximum oder Minimum, z. B. die größte Fläche bei festem Umfang. Man nutzt die Ableitung.</p>",
          detailed: "<p>Vorgehen: Zielgröße als Funktion einer Variablen aufstellen (Nebenbedingung einsetzen), ableiten, f'=0 setzen und Art per f'' prüfen.</p>",
          examples: [
            {q: "Max. Fläche Rechteck, Umfang 20", a: "Quadrat 5×5, A=25."},
            {q: "Min von f(x)=x²+4", a: "bei x=0, Wert 4."},
            {q: "Max von f(x)=−x²+9", a: "bei x=0, Wert 9."}
          ],
          steps: ["Zielfunktion und Nebenbedingung aufstellen.","Nebenbedingung einsetzen (eine Variable).","Ableiten, f'=0, Lösung bestimmen.","Mit f'' als Max/Min bestätigen."],
          formulas: [{name: "Bedingung", tex: "f'(x)=0, f''(x)<0 ⇒ Maximum"}],
          mistakes: ["Nebenbedingung nicht einsetzen.","Randwerte vergessen."],
          exercises: [
            {q: "Min von f(x)=x²?", choices: ["bei x=0","bei x=1","kein Min"], answer: 0, solution: "f'=2x=0 ⇒ x=0."},
            {q: "f''<0 bedeutet …", choices: ["Maximum","Minimum","Wende"], answer: 0, solution: "Rechtskrümmung ⇒ Maximum."},
            {q: "Größte Fläche bei festem Umfang: Form?", choices: ["Quadrat","langes Rechteck","Dreieck"], answer: 0, solution: "Das Quadrat maximiert die Fläche."}
          ]
        }
      ]
    },

    {
      id: "statistik",
      title: "Statistik",
      icon: "📊",
      color: "#0ea5e9",
      description: "Mittelwerte, Wahrscheinlichkeit, Diagramme und Datenanalyse.",
      topics: [
        {
          id: "mittelwert", title: "Mittelwert", icon: "x̄", level: "Anfänger",
          tags: ["mittelwert","durchschnitt","arithmetisches mittel"],
          summary: "Das arithmetische Mittel: Summe durch Anzahl.",
          simple: "<p>Der Mittelwert (Durchschnitt) ist die Summe aller Werte geteilt durch ihre Anzahl.</p>",
          detailed: "<p>Formel: x̄ = (x₁ + x₂ + … + xₙ) / n. Er ist empfindlich gegenüber Ausreißern.</p>",
          examples: [
            {q: "Mittelwert von 2,4,6", a: "(2+4+6)/3 = 4."},
            {q: "Mittelwert von 10,20", a: "15."},
            {q: "Mittelwert von 5,5,5", a: "5."}
          ],
          steps: ["Alle Werte addieren.","Durch die Anzahl teilen."],
          formulas: [{name: "Arithmetisches Mittel", tex: "x̄ = (Σxᵢ)/n"}],
          mistakes: ["Durch falsche Anzahl teilen.","Ausreißer nicht beachten."],
          exercises: [
            {q: "Mittelwert 1,2,3?", choices: ["2","3","1"], answer: 0, solution: "6/3 = 2."},
            {q: "Mittelwert 4,8?", choices: ["6","4","12"], answer: 0, solution: "12/2 = 6."},
            {q: "Mittelwert 0,10?", choices: ["5","10","0"], answer: 0, solution: "10/2 = 5."}
          ]
        },
        {
          id: "median", title: "Median", icon: "⬛", level: "Anfänger",
          tags: ["median","zentralwert"],
          summary: "Der mittlere Wert einer geordneten Datenreihe.",
          simple: "<p>Der Median ist der Wert genau in der Mitte, wenn man die Daten der Größe nach ordnet. Er ist robust gegen Ausreißer.</p>",
          detailed: "<p>Bei ungerader Anzahl ist der Median der mittlere Wert; bei gerader Anzahl der Durchschnitt der beiden mittleren Werte.</p>",
          examples: [
            {q: "Median 1,3,5", a: "3."},
            {q: "Median 1,2,3,4", a: "(2+3)/2 = 2,5."},
            {q: "Median 7,1,5 (ordnen!)", a: "1,5,7 ⇒ 5."}
          ],
          steps: ["Daten der Größe nach sortieren.","Mittleren Wert bestimmen.","Bei gerader Anzahl Mittelwert der zwei mittleren."],
          formulas: [{name: "Position", tex: "Median = Wert an Stelle (n+1)/2"}],
          mistakes: ["Vergessen zu sortieren.","Bei gerader Anzahl nur einen Wert nehmen."],
          exercises: [
            {q: "Median 2,4,6?", choices: ["4","6","2"], answer: 0, solution: "Mittlerer Wert 4."},
            {q: "Median 1,2,3,4?", choices: ["2,5","2","3"], answer: 0, solution: "(2+3)/2 = 2,5."},
            {q: "Median 9,3,6?", choices: ["6","9","3"], answer: 0, solution: "Sortiert 3,6,9 ⇒ 6."}
          ]
        },
        {
          id: "modus", title: "Modus", icon: "🔝", level: "Anfänger",
          tags: ["modus","modalwert","häufigkeit"],
          summary: "Der am häufigsten vorkommende Wert.",
          simple: "<p>Der Modus (Modalwert) ist der Wert, der am häufigsten auftritt.</p>",
          detailed: "<p>Eine Datenreihe kann keinen, einen oder mehrere Modi haben. Er eignet sich auch für nicht-numerische Daten.</p>",
          examples: [
            {q: "Modus von 2,2,3,4", a: "2 (kommt zweimal vor)."},
            {q: "Modus von 1,1,2,2,3", a: "1 und 2 (bimodal)."},
            {q: "Modus von 5,6,7", a: "kein Modus (alle gleich häufig)."}
          ],
          steps: ["Häufigkeit jedes Werts zählen.","Wert(e) mit höchster Häufigkeit angeben."],
          formulas: [{name: "Modus", tex: "häufigster Wert"}],
          mistakes: ["Modus mit Median verwechseln."],
          exercises: [
            {q: "Modus 3,3,4,5?", choices: ["3","4","5"], answer: 0, solution: "3 kommt am häufigsten."},
            {q: "Modus 1,2,3?", choices: ["kein Modus","1","3"], answer: 0, solution: "Alle gleich häufig."},
            {q: "Modus 7,7,7,8?", choices: ["7","8","7,5"], answer: 0, solution: "7 dominiert."}
          ]
        },
        {
          id: "wahrscheinlichkeit", title: "Wahrscheinlichkeit", icon: "🎲", level: "Fortgeschritten",
          tags: ["wahrscheinlichkeit","laplace","ereignis"],
          summary: "Laplace-Wahrscheinlichkeit: günstige durch mögliche Fälle.",
          simple: "<p>Die Wahrscheinlichkeit sagt, wie wahrscheinlich ein Ereignis ist – zwischen 0 (unmöglich) und 1 (sicher).</p>",
          detailed: "<p><strong>Laplace:</strong> P(E) = günstige Fälle / mögliche Fälle. Für unabhängige Ereignisse: P(A und B) = P(A)·P(B).</p>",
          examples: [
            {q: "P(gerade Zahl beim Würfel)", a: "3/6 = 1/2."},
            {q: "P(zweimal Kopf)", a: "1/2·1/2 = 1/4."},
            {q: "P(rote Karte im Skat)", a: "16/32 = 1/2."}
          ],
          steps: ["Zähle alle möglichen Ergebnisse.","Zähle die günstigen Ergebnisse.","Bilde den Quotienten günstige/mögliche."],
          formulas: [
            {name: "Laplace", tex: "P(E) = günstige / mögliche"},
            {name: "UND-Regel", tex: "P(A∩B) = P(A)·P(B)"}
          ],
          mistakes: ["Günstige und mögliche Fälle vertauschen.","Abhängigkeit ignorieren."],
          exercises: [
            {q: "P(6 beim Würfel)?", choices: ["1/6","1/2","6"], answer: 0, solution: "1 von 6."},
            {q: "P(Kopf bei Münze)?", choices: ["1/2","1","1/6"], answer: 0, solution: "1 von 2."},
            {q: "P(Zahl >0 beim Würfel)?", choices: ["1","0","1/6"], answer: 0, solution: "Sicheres Ereignis."}
          ]
        },
        {
          id: "diagramme", title: "Diagramme", icon: "📈", level: "Anfänger",
          tags: ["diagramm","balken","kreis","säulen"],
          summary: "Balken-, Säulen-, Linien- und Kreisdiagramme richtig lesen.",
          simple: "<p>Diagramme stellen Daten anschaulich dar. Je nach Zweck eignen sich Balken-, Linien- oder Kreisdiagramme.</p>",
          detailed: "<p>Balken/Säulen: Vergleich von Kategorien. Linie: Verläufe über die Zeit. Kreis: Anteile am Ganzen (Summe 100 %).</p>",
          examples: [
            {q: "Anteil im Kreisdiagramm: 25 %", a: "= 90° (¼ des Kreises)."},
            {q: "Welches Diagramm für Zeitverlauf?", a: "Liniendiagramm."},
            {q: "Kreis-Anteil 50 %", a: "180°."}
          ],
          steps: ["Achsen und Legende lesen.","Werte ablesen.","Für Kreisdiagramm Prozent in Grad (·3,6) umrechnen."],
          formulas: [{name: "Kreissektor", tex: "Winkel = Anteil% · 3,6°"}],
          mistakes: ["Achsenbeschriftung ignorieren.","Prozente im Kreis falsch in Grad umrechnen."],
          exercises: [
            {q: "25 % im Kreis = ? Grad", choices: ["90°","25°","180°"], answer: 0, solution: "25·3,6 = 90°."},
            {q: "Bestes Diagramm für Anteile?", choices: ["Kreis","Linie","Balken"], answer: 0, solution: "Kreisdiagramm."},
            {q: "100 % im Kreis = ?", choices: ["360°","180°","100°"], answer: 0, solution: "Voller Kreis."}
          ]
        },
        {
          id: "datenanalyse", title: "Datenanalyse", icon: "🧬", level: "Fortgeschritten",
          tags: ["datenanalyse","spannweite","standardabweichung","streuung"],
          summary: "Streuungsmaße: Spannweite, Varianz und Standardabweichung.",
          simple: "<p>Neben dem Mittelwert interessiert, wie stark die Daten streuen. Dafür gibt es Spannweite, Varianz und Standardabweichung.</p>",
          detailed: "<p><strong>Spannweite</strong> = Max − Min. <strong>Varianz</strong> = mittlere quadratische Abweichung vom Mittelwert. <strong>Standardabweichung</strong> = √Varianz.</p>",
          examples: [
            {q: "Spannweite von 3,7,10", a: "10 − 3 = 7."},
            {q: "Varianz von 2,4 (x̄=3)", a: "((1)²+(1)²)/2 = 1."},
            {q: "Standardabw. bei Varianz 9", a: "√9 = 3."}
          ],
          steps: ["Mittelwert berechnen.","Abweichungen quadrieren und mitteln (Varianz).","Wurzel ziehen (Standardabweichung)."],
          formulas: [
            {name: "Spannweite", tex: "R = xₘₐₓ − xₘᵢₙ"},
            {name: "Standardabw.", tex: "σ = √Varianz"}
          ],
          mistakes: ["Wurzel bei der Standardabweichung vergessen.","Nicht vom Mittelwert abweichen."],
          exercises: [
            {q: "Spannweite 1,5,9?", choices: ["8","5","9"], answer: 0, solution: "9−1 = 8."},
            {q: "σ bei Varianz 16?", choices: ["4","16","8"], answer: 0, solution: "√16 = 4."},
            {q: "Spannweite 10,10?", choices: ["0","10","20"], answer: 0, solution: "10−10 = 0."}
          ]
        }
      ]
    },

    {
      id: "schulmathematik",
      title: "Schulmathematik",
      icon: "🎒",
      color: "#ef4444",
      description: "Von der Grundschule bis zur Abiturvorbereitung.",
      topics: [
        {
          id: "grundschule", title: "Grundschule", icon: "🧒", level: "Anfänger",
          tags: ["grundschule","einmaleins","grundrechenarten"],
          summary: "Grundrechenarten, Einmaleins und Zahlenraum bis 1000.",
          simple: "<p>In der Grundschule lernt man Zählen, die vier Grundrechenarten und das kleine Einmaleins – das Fundament für alles Weitere.</p>",
          detailed: "<p>Schwerpunkte: Addition/Subtraktion im Zahlenraum bis 1000, kleines Einmaleins (1×1 bis 10×10), einfache Sachaufgaben und Geometrie-Grundformen.</p>",
          examples: [
            {q: "7 · 8 = ?", a: "56."},
            {q: "345 + 128 = ?", a: "473."},
            {q: "63 : 9 = ?", a: "7."}
          ],
          steps: ["Zahlen stellengerecht untereinander schreiben.","Von rechts nach links rechnen.","Überträge beachten."],
          formulas: [{name: "Einmaleins", tex: "a · b (bis 10 × 10)"}],
          mistakes: ["Übertrag vergessen.","Stellen verrutschen."],
          exercises: [
            {q: "6 · 7 = ?", choices: ["42","36","48"], answer: 0, solution: "6·7 = 42."},
            {q: "100 − 45 = ?", choices: ["55","65","45"], answer: 0, solution: "100−45 = 55."},
            {q: "24 : 6 = ?", choices: ["4","6","3"], answer: 0, solution: "24:6 = 4."}
          ]
        },
        {
          id: "sek1", title: "Sekundarstufe I", icon: "📗", level: "Fortgeschritten",
          tags: ["sekundarstufe","bruchrechnung","gleichungen","geometrie"],
          summary: "Klassen 5–10: Bruchrechnung, Prozente, Gleichungen, Geometrie.",
          simple: "<p>In der Sekundarstufe I baut man auf: Brüche, Prozente, Terme, lineare Gleichungen und Geometrie kommen dazu.</p>",
          detailed: "<p>Kernthemen: rationale Zahlen, Terme &amp; Variablen, lineare Gleichungen/Funktionen, Prozent- und Zinsrechnung, Flächen &amp; Körper, Satz des Pythagoras, Einführung Trigonometrie.</p>",
          examples: [
            {q: "Löse 3x − 6 = 9", a: "x = 5."},
            {q: "20 % von 150", a: "30."},
            {q: "Fläche Kreis r=3 (π≈3,14)", a: "≈ 28,3."}
          ],
          steps: ["Grundlagen sicher beherrschen.","Themen der Reihe nach vertiefen.","Viel mit Textaufgaben üben."],
          formulas: [{name: "Zinsen", tex: "Z = K · p/100 · t"}],
          mistakes: ["Lücken bei Bruchrechnung mitschleppen.","Textaufgaben nicht in Terme übersetzen."],
          exercises: [
            {q: "Löse 2x = 10", choices: ["x=5","x=20","x=8"], answer: 0, solution: ":2 ⇒ 5."},
            {q: "10 % von 200?", choices: ["20","10","2"], answer: 0, solution: "200·0,1 = 20."},
            {q: "a²+b²= ? (Pythagoras)", choices: ["c²","c","2c"], answer: 0, solution: "= c²."}
          ]
        },
        {
          id: "sek2", title: "Sekundarstufe II", icon: "📘", level: "Experte",
          tags: ["oberstufe","analysis","stochastik","geometrie"],
          summary: "Oberstufe: Analysis, analytische Geometrie und Stochastik.",
          simple: "<p>In der Oberstufe stehen drei große Gebiete im Fokus: Analysis (Ableitung/Integral), analytische Geometrie (Vektoren) und Stochastik.</p>",
          detailed: "<p>Analysis: Kurvendiskussion, Integralrechnung. Geometrie: Geraden/Ebenen im Raum, Skalarprodukt. Stochastik: Wahrscheinlichkeit, Binomialverteilung.</p>",
          examples: [
            {q: "Ableitung von x³?", a: "3x²."},
            {q: "∫ x dx?", a: "x²/2 + C."},
            {q: "P bei n=2 Münzwürfen, 2×Kopf?", a: "1/4."}
          ],
          steps: ["Analysis-Schema üben (Kurvendiskussion).","Vektorrechnung systematisch lernen.","Stochastik-Grundmodelle beherrschen."],
          formulas: [{name: "Binomialkoeffizient", tex: "P = C(n,k)·pᵏ·(1−p)ⁿ⁻ᵏ"}],
          mistakes: ["Rechenregeln der Analysis nur auswendig lernen.","Vektoren mit Skalaren verwechseln."],
          exercises: [
            {q: "f(x)=x², f'(x)=?", choices: ["2x","x","2"], answer: 0, solution: "2x."},
            {q: "∫ 2 dx?", choices: ["2x + C","2","x"], answer: 0, solution: "2x + C."},
            {q: "P(6er-Pasch) beim Würfel²?", choices: ["1/36","1/6","1/12"], answer: 0, solution: "1/6·1/6."}
          ]
        },
        {
          id: "abitur", title: "Abiturvorbereitung", icon: "🎓", level: "Experte",
          tags: ["abitur","prüfung","vorbereitung"],
          summary: "Strukturierte Prüfungsvorbereitung mit Themenüberblick und Strategie.",
          simple: "<p>Fürs Abitur zählt gezielte Wiederholung aller Kernthemen plus Übung mit Original-Prüfungsaufgaben und Zeitmanagement.</p>",
          detailed: "<p>Empfohlener Plan: 1) Grundlagen sichern, 2) Analysis, Geometrie, Stochastik systematisch wiederholen, 3) Altklausuren unter Zeitdruck üben, 4) Formelsammlung sicher nutzen.</p>",
          examples: [
            {q: "Typische Analysis-Aufgabe?", a: "Vollständige Kurvendiskussion inkl. Integral."},
            {q: "Typische Geometrie-Aufgabe?", a: "Lagebeziehung von Geraden/Ebenen."},
            {q: "Typische Stochastik-Aufgabe?", a: "Binomialverteilung und Erwartungswert."}
          ],
          steps: ["Lernplan mit Zeitfenstern erstellen.","Themen abwechselnd wiederholen.","Prüfungsaufgaben simulieren.","Fehler analysieren und gezielt nachüben."],
          formulas: [{name: "Erwartungswert", tex: "E(X) = Σ xᵢ·P(xᵢ)"}],
          mistakes: ["Zu spät mit Altklausuren beginnen.","Nur lesen statt aktiv rechnen."],
          exercises: [
            {q: "Bestes Übungsmaterial?", choices: ["Altklausuren","nur Theorie","nur Videos"], answer: 0, solution: "Original-Prüfungsaufgaben üben."},
            {q: "E(X) einer fairen Münze (0/1)?", choices: ["0,5","1","0"], answer: 0, solution: "0·0,5+1·0,5 = 0,5."},
            {q: "Wichtig in der Prüfung?", choices: ["Zeitmanagement","Raten","Abschreiben"], answer: 0, solution: "Zeit einteilen."}
          ]
        }
      ]
    },

    {
      id: "hochschulmathematik",
      title: "Hochschulmathematik",
      icon: "🏛️",
      color: "#14b8a6",
      description: "Lineare Algebra, Matrizen, Vektoren und mehr.",
      topics: [
        {
          id: "lineare-algebra", title: "Lineare Algebra", icon: "🧱", level: "Experte",
          tags: ["lineare algebra","vektorraum","gleichungssystem"],
          summary: "Vektorräume, lineare Gleichungssysteme und das Gauß-Verfahren.",
          simple: "<p>Die lineare Algebra untersucht Vektoren, Matrizen und lineare Gleichungssysteme – die Grundlage für Physik, Informatik und Wirtschaft.</p>",
          detailed: "<p>Zentral ist das Lösen von <strong>linearen Gleichungssystemen</strong> mit dem <strong>Gauß-Verfahren</strong>: Umformen in Stufenform durch Zeilenoperationen.</p>",
          examples: [
            {q: "LGS: x+y=5, x−y=1", a: "Addieren: 2x=6 ⇒ x=3, y=2."},
            {q: "2x=8", a: "x = 4."},
            {q: "x+y=2, 2x+2y=4", a: "unendlich viele Lösungen (identisch)."}
          ],
          steps: ["Gleichungssystem als Matrix schreiben.","Mit Zeilenoperationen Stufenform herstellen.","Von unten nach oben rückwärts einsetzen."],
          formulas: [{name: "LGS", tex: "A·x = b"}],
          mistakes: ["Zeilenoperationen nur auf einer Seite ausführen.","Sonderfälle (keine/unendlich Lösungen) übersehen."],
          exercises: [
            {q: "x+y=4, x−y=0 ⇒ x=?", choices: ["2","4","0"], answer: 0, solution: "2x=4 ⇒ x=2."},
            {q: "Wofür Gauß-Verfahren?", choices: ["LGS lösen","ableiten","integrieren"], answer: 0, solution: "Lineare Gleichungssysteme."},
            {q: "A·x=b: A ist eine …", choices: ["Matrix","Zahl","Wurzel"], answer: 0, solution: "Koeffizientenmatrix."}
          ]
        },
        {
          id: "matrizen", title: "Matrizen", icon: "🔲", level: "Experte",
          tags: ["matrix","matrizenmultiplikation","determinante"],
          summary: "Rechnen mit Matrizen: Addition, Multiplikation, Determinante.",
          simple: "<p>Eine Matrix ist ein rechteckiges Zahlenschema. Mit Matrizen beschreibt man lineare Abbildungen und löst Gleichungssysteme kompakt.</p>",
          detailed: "<p>Addition elementweise; Multiplikation „Zeile mal Spalte“. Die <strong>Determinante</strong> einer 2×2-Matrix: det = ad − bc. Ist sie ≠ 0, ist die Matrix invertierbar.</p>",
          examples: [
            {q: "det [[2,1],[1,3]]", a: "2·3 − 1·1 = 5."},
            {q: "[[1,0],[0,1]] ist …", a: "die Einheitsmatrix."},
            {q: "Größe von 2×3-Matrix", a: "2 Zeilen, 3 Spalten."}
          ],
          steps: ["Dimensionen prüfen (für · muss Spalten = Zeilen).","Bei · jedes Element als Zeile·Spalte berechnen.","Determinante nach ad−bc (2×2)."],
          formulas: [{name: "Determinante 2×2", tex: "det = a·d − b·c"}],
          mistakes: ["Matrizenmultiplikation als elementweise annehmen.","Dimensionen nicht prüfen."],
          exercises: [
            {q: "det [[1,2],[3,4]]?", choices: ["−2","2","10"], answer: 0, solution: "1·4−2·3 = −2."},
            {q: "Einheitsmatrix Hauptdiagonale?", choices: ["1","0","−1"], answer: 0, solution: "Einsen auf der Diagonale."},
            {q: "2×3 · 3×2 ergibt …", choices: ["2×2","3×3","nicht def."], answer: 0, solution: "Zeilen×Spalten = 2×2."}
          ]
        },
        {
          id: "vektoren", title: "Vektoren", icon: "➡️", level: "Experte",
          tags: ["vektor","skalarprodukt","betrag"],
          summary: "Vektoren, Betrag, Skalarprodukt und Orthogonalität.",
          simple: "<p>Ein Vektor hat Richtung und Länge. Man addiert Vektoren komponentenweise und misst Winkel mit dem Skalarprodukt.</p>",
          detailed: "<p><strong>Betrag:</strong> |v| = √(x²+y²+z²). <strong>Skalarprodukt:</strong> a·b = a₁b₁+a₂b₂+a₃b₃. Ist a·b = 0, stehen die Vektoren senkrecht.</p>",
          examples: [
            {q: "Betrag von (3,4)", a: "√(9+16) = 5."},
            {q: "(1,0)·(0,1)", a: "0 ⇒ orthogonal."},
            {q: "(1,2)+(3,4)", a: "(4,6)."}
          ],
          steps: ["Komponenten notieren.","Für Betrag Quadrate summieren und Wurzel ziehen.","Für Skalarprodukt komponentenweise multiplizieren und addieren."],
          formulas: [
            {name: "Betrag", tex: "|v| = √(x²+y²+z²)"},
            {name: "Skalarprodukt", tex: "a·b = Σ aᵢ·bᵢ"}
          ],
          mistakes: ["Skalarprodukt mit Vektorprodukt verwechseln.","Wurzel beim Betrag vergessen."],
          exercises: [
            {q: "Betrag (0,5)?", choices: ["5","25","0"], answer: 0, solution: "√25 = 5."},
            {q: "(2,0)·(0,3)?", choices: ["0","6","5"], answer: 0, solution: "orthogonal ⇒ 0."},
            {q: "(1,1)+(1,1)?", choices: ["(2,2)","(1,1)","(0,0)"], answer: 0, solution: "komponentenweise."}
          ]
        },
        {
          id: "differentialgleichungen", title: "Differentialgleichungen", icon: "🌀", level: "Experte",
          tags: ["dgl","wachstum","exponential"],
          summary: "Gleichungen mit Ableitungen – Modelle für Wachstum und Zerfall.",
          simple: "<p>Eine Differentialgleichung verknüpft eine Funktion mit ihren Ableitungen. Sie beschreibt z. B. Wachstum, Zerfall oder Schwingungen.</p>",
          detailed: "<p>Beispiel exponentielles Wachstum: y' = k·y hat die Lösung y = y₀·eᵏᵗ. Solche DGL modellieren Bevölkerung, Zinsen und radioaktiven Zerfall.</p>",
          examples: [
            {q: "Lösung von y' = y?", a: "y = C·eᵗ."},
            {q: "k<0 bedeutet …", a: "Zerfall/Abnahme."},
            {q: "y'=0 heißt …", a: "y ist konstant."}
          ],
          steps: ["Art der DGL erkennen.","Passenden Lösungsansatz (z. B. eᵏᵗ) wählen.","Anfangsbedingung einsetzen, C bestimmen."],
          formulas: [{name: "Wachstum", tex: "y = y₀·eᵏᵗ"}],
          mistakes: ["Anfangsbedingung nicht nutzen.","Vorzeichen von k falsch deuten."],
          exercises: [
            {q: "y'=y hat Lösung …", choices: ["C·eᵗ","t²","sin t"], answer: 0, solution: "Exponentialfunktion."},
            {q: "k>0 bedeutet …", choices: ["Wachstum","Zerfall","konstant"], answer: 0, solution: "Zunahme."},
            {q: "Modell radioaktiver Zerfall?", choices: ["y=y₀eᵏᵗ, k<0","y=x²","y=mx+b"], answer: 0, solution: "Exponentieller Zerfall."}
          ]
        },
        {
          id: "numerische-mathematik", title: "Numerische Mathematik", icon: "💻", level: "Experte",
          tags: ["numerik","näherung","newton-verfahren"],
          summary: "Näherungsverfahren wie das Newton-Verfahren für Nullstellen.",
          simple: "<p>Nicht jede Gleichung lässt sich exakt lösen. Numerische Verfahren berechnen gute Näherungen – wichtig für Computer und Technik.</p>",
          detailed: "<p>Das <strong>Newton-Verfahren</strong> nähert Nullstellen: xₙ₊₁ = xₙ − f(xₙ)/f'(xₙ). Es konvergiert oft sehr schnell, braucht aber einen guten Startwert.</p>",
          examples: [
            {q: "Wozu Newton-Verfahren?", a: "Nullstellen näherungsweise finden."},
            {q: "Was braucht Newton?", a: "f, f' und einen Startwert x₀."},
            {q: "√2 numerisch?", a: "Iteration liefert 1,4142…"}
          ],
          steps: ["Startwert x₀ wählen.","xₙ₊₁ = xₙ − f(xₙ)/f'(xₙ) berechnen.","Iterieren, bis die Änderung sehr klein ist."],
          formulas: [{name: "Newton-Iteration", tex: "xₙ₊₁ = xₙ − f(xₙ)/f'(xₙ)"}],
          mistakes: ["Schlechten Startwert wählen (keine Konvergenz).","Abbruchkriterium vergessen."],
          exercises: [
            {q: "Newton findet …", choices: ["Nullstellen","Extrema direkt","Integrale"], answer: 0, solution: "Nullstellen näherungsweise."},
            {q: "Newton braucht …", choices: ["f'(x)","nur f","nichts"], answer: 0, solution: "Ableitung f'."},
            {q: "Numerik liefert …", choices: ["Näherungen","exakte Brüche","Beweise"], answer: 0, solution: "Approximationen."}
          ]
        }
      ]
    }
  ]
};

/* Flache Liste aller Themen für Suche & Router */
const ALL_TOPICS = CONTENT.categories.flatMap(cat =>
  cat.topics.map(t => ({ ...t, categoryId: cat.id, categoryTitle: cat.title, categoryColor: cat.color }))
);

if (typeof window !== "undefined") {
  window.CONTENT = CONTENT;
  window.ALL_TOPICS = ALL_TOPICS;
}
