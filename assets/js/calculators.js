/* =============================================================
   MatheMeister – Rechner (calculators.js)
   Taschenrechner, Prozent-, Bruch-, Gleichungs- und Geometrierechner.
   ============================================================= */

const Calculators = {
  list: [
    { id: "scientific", title: "Taschenrechner", icon: "🧮", desc: "Wissenschaftlicher Rechner mit Grundrechenarten, Wurzel, Potenz und Klammern." },
    { id: "percent", title: "Prozentrechner", icon: "％", desc: "Prozentwert, Grundwert und Prozentsatz im Handumdrehen." },
    { id: "fraction", title: "Bruchrechner", icon: "½", desc: "Brüche addieren, subtrahieren, multiplizieren, dividieren und kürzen." },
    { id: "equation", title: "Gleichungsrechner", icon: "🟰", desc: "Lineare und quadratische Gleichungen lösen." },
    { id: "geometry", title: "Geometrierechner", icon: "📐", desc: "Fläche und Umfang gängiger Formen berechnen." }
  ],

  render(id, mount) {
    switch (id) {
      case "scientific": return this.scientific(mount);
      case "percent": return this.percent(mount);
      case "fraction": return this.fraction(mount);
      case "equation": return this.equation(mount);
      case "geometry": return this.geometry(mount);
    }
  },

  /* ---- sichere Auswertung eines math. Ausdrucks (kein freies eval) ---- */
  safeEval(expr) {
    // Symbole und Trennzeichen normalisieren
    let s = String(expr).replace(/,/g, ".").replace(/×/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");
    // Funktionen und Konstanten in erlaubte JS-Tokens übersetzen
    s = s.replace(/√\(/g, "Math.sqrt(")
         .replace(/π/g, "(Math.PI)")
         .replace(/\^/g, "**")
         .replace(/sin\(/g, "Math.sin(")
         .replace(/cos\(/g, "Math.cos(")
         .replace(/tan\(/g, "Math.tan(")
         .replace(/ln\(/g, "Math.log(")
         .replace(/log\(/g, "Math.log10(");
    // Whitelist: bekannte Math-Tokens entfernen, danach dürfen nur Ziffern/Operatoren übrig bleiben
    const stripped = s.replace(/Math\.(sqrt|sin|cos|tan|log10|log|PI)/g, "");
    if (stripped === "" || !/^[0-9+\-*/.()]*$/.test(stripped)) throw new Error("Ungültige Eingabe");
    // eslint-disable-next-line no-new-func
    const val = Function('"use strict"; return (' + s + ')')();
    if (typeof val !== "number" || !isFinite(val)) throw new Error("Ungültig");
    return Math.round(val * 1e10) / 1e10;
  },

  scientific(mount) {
    const keys = ["7","8","9","÷","√(","4","5","6","×","^","1","2","3","−","π","0",".","(",")","+"];
    mount.innerHTML = `
      <div class="calc calc--sci">
        <input id="calcDisplay" class="calc-display" type="text" value="" placeholder="0" aria-label="Anzeige" />
        <div class="calc-keys">
          <button class="calc-key calc-key--fn" data-k="C">C</button>
          <button class="calc-key calc-key--fn" data-k="⌫">⌫</button>
          <button class="calc-key calc-key--fn" data-k="sin(">sin</button>
          <button class="calc-key calc-key--fn" data-k="cos(">cos</button>
          ${keys.map(k => `<button class="calc-key${["÷","×","−","+","^"].includes(k)?" calc-key--op":""}" data-k="${k}">${k}</button>`).join("")}
          <button class="calc-key calc-key--eq" data-k="=">=</button>
        </div>
      </div>`;
    const disp = mount.querySelector("#calcDisplay");
    mount.querySelectorAll(".calc-key").forEach(btn => {
      btn.addEventListener("click", () => {
        const k = btn.dataset.k;
        if (k === "C") disp.value = "";
        else if (k === "⌫") disp.value = disp.value.slice(0, -1);
        else if (k === "=") {
          try { disp.value = String(this.safeEval(disp.value)); }
          catch { disp.value = "Fehler"; }
        } else {
          if (disp.value === "Fehler") disp.value = "";
          const map = { "−": "-", "×": "*", "÷": "/" };
          disp.value += (map[k] || k);
        }
      });
    });
  },

  percent(mount) {
    mount.innerHTML = `
      <div class="calc calc--form">
        <h3>Prozentwert berechnen</h3>
        <div class="calc-row">
          <label>Prozentsatz (%)<input id="pPercent" type="number" placeholder="z. B. 20"></label>
          <label>Grundwert<input id="pBase" type="number" placeholder="z. B. 80"></label>
        </div>
        <button class="btn btn--primary" id="pCalc">Berechnen</button>
        <output class="calc-out" id="pOut" aria-live="polite"></output>
      </div>`;
    mount.querySelector("#pCalc").addEventListener("click", () => {
      const p = parseFloat(mount.querySelector("#pPercent").value);
      const g = parseFloat(mount.querySelector("#pBase").value);
      const out = mount.querySelector("#pOut");
      if (isNaN(p) || isNaN(g)) { out.textContent = "Bitte beide Felder ausfüllen."; return; }
      const w = g * p / 100;
      out.innerHTML = `<strong>${p} %</strong> von <strong>${g}</strong> = <strong>${Math.round(w*1e6)/1e6}</strong>`;
    });
  },

  gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; },

  fraction(mount) {
    mount.innerHTML = `
      <div class="calc calc--form">
        <h3>Bruchrechner</h3>
        <div class="calc-frac">
          <input id="fA" type="number" placeholder="Zähler"><span>/</span><input id="fB" type="number" placeholder="Nenner">
          <select id="fOp"><option>+</option><option>−</option><option>×</option><option>÷</option></select>
          <input id="fC" type="number" placeholder="Zähler"><span>/</span><input id="fD" type="number" placeholder="Nenner">
        </div>
        <button class="btn btn--primary" id="fCalc">Berechnen</button>
        <output class="calc-out" id="fOut" aria-live="polite"></output>
      </div>`;
    mount.querySelector("#fCalc").addEventListener("click", () => {
      const a = parseInt(mount.querySelector("#fA").value), b = parseInt(mount.querySelector("#fB").value);
      const c = parseInt(mount.querySelector("#fC").value), d = parseInt(mount.querySelector("#fD").value);
      const op = mount.querySelector("#fOp").value, out = mount.querySelector("#fOut");
      if ([a,b,c,d].some(isNaN) || b === 0 || d === 0) { out.textContent = "Bitte gültige Brüche eingeben (Nenner ≠ 0)."; return; }
      let num, den;
      if (op === "+") { num = a*d + c*b; den = b*d; }
      else if (op === "−") { num = a*d - c*b; den = b*d; }
      else if (op === "×") { num = a*c; den = b*d; }
      else { num = a*d; den = b*c; }
      if (den === 0) { out.textContent = "Division durch 0 nicht möglich."; return; }
      const g = this.gcd(num, den);
      let sign = (den < 0) ? -1 : 1;
      num = num / g * sign; den = Math.abs(den / g);
      out.innerHTML = `Ergebnis: <strong>${num}/${den}</strong>` + (den !== 0 ? ` ≈ ${Math.round(num/den*1e4)/1e4}` : "");
    });
  },

  equation(mount) {
    mount.innerHTML = `
      <div class="calc calc--form">
        <h3>Gleichungsrechner</h3>
        <p class="calc-hint">Löst ax² + bx + c = 0 (für lineare Gleichung a = 0 setzen).</p>
        <div class="calc-row">
          <label>a<input id="eqA" type="number" placeholder="0"></label>
          <label>b<input id="eqB" type="number" placeholder="0"></label>
          <label>c<input id="eqC" type="number" placeholder="0"></label>
        </div>
        <button class="btn btn--primary" id="eqCalc">Lösen</button>
        <output class="calc-out" id="eqOut" aria-live="polite"></output>
      </div>`;
    mount.querySelector("#eqCalc").addEventListener("click", () => {
      const a = parseFloat(mount.querySelector("#eqA").value) || 0;
      const b = parseFloat(mount.querySelector("#eqB").value) || 0;
      const c = parseFloat(mount.querySelector("#eqC").value) || 0;
      const out = mount.querySelector("#eqOut");
      const r = n => Math.round(n * 1e6) / 1e6;
      if (a === 0) {
        if (b === 0) { out.textContent = c === 0 ? "Unendlich viele Lösungen." : "Keine Lösung."; return; }
        out.innerHTML = `Lineare Gleichung: <strong>x = ${r(-c/b)}</strong>`;
        return;
      }
      const D = b*b - 4*a*c;
      if (D < 0) { out.innerHTML = `Diskriminante D = ${r(D)} &lt; 0 → <strong>keine reelle Lösung</strong>.`; return; }
      if (D === 0) { out.innerHTML = `Eine Lösung: <strong>x = ${r(-b/(2*a))}</strong>`; return; }
      const x1 = (-b + Math.sqrt(D)) / (2*a), x2 = (-b - Math.sqrt(D)) / (2*a);
      out.innerHTML = `Zwei Lösungen: <strong>x₁ = ${r(x1)}</strong>, <strong>x₂ = ${r(x2)}</strong>`;
    });
  },

  geometry(mount) {
    mount.innerHTML = `
      <div class="calc calc--form">
        <h3>Geometrierechner</h3>
        <label>Form
          <select id="gShape">
            <option value="rect">Rechteck</option>
            <option value="square">Quadrat</option>
            <option value="circle">Kreis</option>
            <option value="triangle">Dreieck</option>
          </select>
        </label>
        <div class="calc-row" id="gInputs"></div>
        <button class="btn btn--primary" id="gCalc">Berechnen</button>
        <output class="calc-out" id="gOut" aria-live="polite"></output>
      </div>`;
    const inputs = mount.querySelector("#gInputs");
    const fields = {
      rect: [["a","Länge a"],["b","Breite b"]],
      square: [["a","Seite a"]],
      circle: [["r","Radius r"]],
      triangle: [["g","Grundseite g"],["h","Höhe h"]]
    };
    const build = () => {
      const shape = mount.querySelector("#gShape").value;
      inputs.innerHTML = fields[shape].map(([id,label]) =>
        `<label>${label}<input id="g_${id}" type="number" min="0"></label>`).join("");
    };
    build();
    mount.querySelector("#gShape").addEventListener("change", () => { build(); mount.querySelector("#gOut").textContent = ""; });
    mount.querySelector("#gCalc").addEventListener("click", () => {
      const shape = mount.querySelector("#gShape").value;
      const val = id => parseFloat((mount.querySelector("#g_" + id) || {}).value);
      const out = mount.querySelector("#gOut");
      const r = n => Math.round(n * 1e4) / 1e4;
      let area, peri;
      if (shape === "rect") { const a = val("a"), b = val("b"); if ([a,b].some(isNaN)) return out.textContent = "Bitte alle Felder ausfüllen."; area = a*b; peri = 2*(a+b); }
      else if (shape === "square") { const a = val("a"); if (isNaN(a)) return out.textContent = "Bitte Feld ausfüllen."; area = a*a; peri = 4*a; }
      else if (shape === "circle") { const rr = val("r"); if (isNaN(rr)) return out.textContent = "Bitte Feld ausfüllen."; area = Math.PI*rr*rr; peri = 2*Math.PI*rr; }
      else { const g = val("g"), h = val("h"); if ([g,h].some(isNaN)) return out.textContent = "Bitte alle Felder ausfüllen."; area = 0.5*g*h; peri = null; }
      out.innerHTML = `Fläche = <strong>${r(area)}</strong>` + (peri != null ? ` · Umfang = <strong>${r(peri)}</strong>` : "");
    });
  }
};

if (typeof window !== "undefined") window.Calculators = Calculators;
