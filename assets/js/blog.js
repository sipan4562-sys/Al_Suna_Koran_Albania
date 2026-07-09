/* =============================================================
   MatheMeister – Blog-Beiträge (blog.js)
   ============================================================= */

const BLOG_POSTS = [
  {
    id: "mathe-lernen-tipps",
    tag: "Lernstrategie",
    title: "10 Tipps, um Mathe wirklich zu verstehen",
    excerpt: "Warum aktives Rechnen und Wiederholung wichtiger sind als stures Auswendiglernen.",
    date: "5. Juli 2026", read: "6 Min. Lesezeit",
    body: `
      <p>Mathematik ist kein Fach zum Auswendiglernen, sondern zum <strong>Verstehen und Anwenden</strong>. Hier sind zehn erprobte Tipps:</p>
      <ol>
        <li><strong>Aktiv rechnen:</strong> Lies nicht nur Lösungen, sondern rechne selbst.</li>
        <li><strong>Grundlagen sichern:</strong> Lücken bei Brüchen oder Termen rächen sich später.</li>
        <li><strong>Fehler analysieren:</strong> Jeder Fehler zeigt, wo du nachbessern kannst.</li>
        <li><strong>Regelmäßig üben:</strong> Lieber täglich 20 Minuten als einmal drei Stunden.</li>
        <li><strong>Erklären üben:</strong> Wer einem anderen ein Thema erklärt, versteht es selbst besser.</li>
        <li><strong>Visualisieren:</strong> Skizzen und Graphen machen Zusammenhänge greifbar.</li>
        <li><strong>Formeln herleiten:</strong> Verstehe, warum eine Formel gilt.</li>
        <li><strong>Mit Beispielen arbeiten:</strong> Konkrete Zahlen helfen beim Einstieg.</li>
        <li><strong>Pausen machen:</strong> Das Gehirn verarbeitet Gelerntes in Ruhephasen.</li>
        <li><strong>Dranbleiben:</strong> Übung macht den Meister – im wahrsten Sinne.</li>
      </ol>
      <p>Nutze die interaktiven Übungen dieser Plattform, um jeden Punkt direkt anzuwenden.</p>`
  },
  {
    id: "pythagoras-alltag",
    tag: "Erklärung",
    title: "Der Satz des Pythagoras im Alltag",
    excerpt: "Von der Leiter an der Wand bis zum Bildschirmformat – wo a²+b²=c² überall steckt.",
    date: "28. Juni 2026", read: "4 Min. Lesezeit",
    body: `
      <p>Der Satz des Pythagoras <code>a² + b² = c²</code> gilt in jedem rechtwinkligen Dreieck – und begegnet uns überraschend oft:</p>
      <ul>
        <li><strong>Handwerk:</strong> Ob eine Ecke exakt rechtwinklig ist, prüft man mit dem 3-4-5-Dreieck.</li>
        <li><strong>Navigation:</strong> Die Luftlinie zwischen zwei Punkten ist die Hypotenuse.</li>
        <li><strong>Bildschirme:</strong> Die Zolldiagonale ergibt sich aus Breite und Höhe.</li>
        <li><strong>Sport:</strong> Die Distanz quer über ein Spielfeld folgt demselben Prinzip.</li>
      </ul>
      <p>Wer das Prinzip einmal verstanden hat, erkennt es überall. Vertiefe es im Thema „Satz des Pythagoras“.</p>`
  },
  {
    id: "prozente-verstehen",
    tag: "Tipps & Tricks",
    title: "Prozente im Kopf rechnen",
    excerpt: "Schnelle Tricks für Rabatte, Trinkgeld und Mehrwertsteuer ohne Taschenrechner.",
    date: "20. Juni 2026", read: "5 Min. Lesezeit",
    body: `
      <p>Prozentrechnung wird viel einfacher mit ein paar Kopfrechen-Tricks:</p>
      <ul>
        <li><strong>10 %:</strong> Komma eine Stelle nach links – 10 % von 240 = 24.</li>
        <li><strong>1 %:</strong> Komma zwei Stellen nach links – 1 % von 240 = 2,4.</li>
        <li><strong>5 %:</strong> Die Hälfte von 10 % – also 12 bei 240.</li>
        <li><strong>20 %:</strong> 10 % verdoppeln – 48 bei 240.</li>
        <li><strong>Trick:</strong> „X % von Y“ ist dasselbe wie „Y % von X“. 8 % von 50 = 50 % von 8 = 4.</li>
      </ul>
      <p>Mit dem Prozentrechner dieser Seite kannst du deine Kopfrechnungen sofort überprüfen.</p>`
  },
  {
    id: "ableitung-anschaulich",
    tag: "Erklärung",
    title: "Was die Ableitung anschaulich bedeutet",
    excerpt: "Steigung, Geschwindigkeit und Änderungsrate – die Ableitung ganz ohne Formelangst.",
    date: "12. Juni 2026", read: "7 Min. Lesezeit",
    body: `
      <p>Die Ableitung wirkt abstrakt, ist aber sehr anschaulich: Sie misst, wie schnell sich etwas <strong>ändert</strong>.</p>
      <p>Stell dir eine Autofahrt vor. Der zurückgelegte Weg ist eine Funktion der Zeit. Die <strong>Ableitung dieser Funktion ist die Geschwindigkeit</strong> – also wie schnell sich der Weg pro Zeit ändert.</p>
      <p>Grafisch ist die Ableitung die <strong>Steigung der Tangente</strong> an jedem Punkt des Graphen:</p>
      <ul>
        <li>Steigt der Graph, ist die Ableitung positiv.</li>
        <li>Fällt er, ist sie negativ.</li>
        <li>An Hoch- und Tiefpunkten ist sie null.</li>
      </ul>
      <p>Genau deshalb nutzt man <code>f'(x) = 0</code>, um Extremstellen zu finden. Mehr dazu im Thema „Ableitungen“.</p>`
  },
  {
    id: "angst-vor-mathe",
    tag: "Motivation",
    title: "Keine Angst vor Mathe: So gelingt der Einstieg",
    excerpt: "Mathe-Angst ist verbreitet – und überwindbar. Ein Plan für einen entspannten Neustart.",
    date: "3. Juni 2026", read: "5 Min. Lesezeit",
    body: `
      <p>Viele Menschen glauben, sie seien „keine Mathe-Typen“. Doch Mathematik ist eine <strong>Fähigkeit, die man trainieren kann</strong> – wie eine Sprache.</p>
      <p>Ein sanfter Einstieg:</p>
      <ol>
        <li>Starte bei den <strong>Grundlagen</strong>, auch wenn sie leicht wirken.</li>
        <li>Feiere kleine Erfolge – jedes gelöste Beispiel zählt.</li>
        <li>Setze auf <strong>Verständnis statt Tempo</strong>.</li>
        <li>Nutze Lernpfade, um Schritt für Schritt aufzubauen.</li>
      </ol>
      <p>Mit dem Lernpfad „Anfänger“ dieser Plattform baust du systematisch Sicherheit auf.</p>`
  }
];

if (typeof window !== "undefined") window.BLOG_POSTS = BLOG_POSTS;
