/* =========================================================================
   MatheMeister – Calculators
   Functional calculators wired up after their markup is rendered.
   ========================================================================= */
(function () {
  const t = (k) => window.MM_t ? window.MM_t(k) : k;

  /* ---------- gcd helper ---------- */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }

  /* ---------- Safe scientific expression evaluator (no eval) ---------- */
  function evalExpr(expr) {
    // tokenizer + shunting-yard for + - * / ^ %, functions, constants
    expr = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/π/g, "PI").replace(/√/g, "sqrt");
    const funcs = { sin:Math.sin, cos:Math.cos, tan:Math.tan, sqrt:Math.sqrt, ln:Math.log,
      log:(x)=>Math.log10(x), abs:Math.abs, asin:Math.asin, acos:Math.acos, atan:Math.atan, exp:Math.exp };
    const consts = { PI: Math.PI, E: Math.E };
    let i = 0;
    const tokens = [];
    while (i < expr.length) {
      const c = expr[i];
      if (c === " ") { i++; continue; }
      if (/[0-9.]/.test(c)) { let n = ""; while (i < expr.length && /[0-9.]/.test(expr[i])) n += expr[i++]; tokens.push({ t: "num", v: parseFloat(n) }); continue; }
      if (/[a-zA-Z]/.test(c)) { let s = ""; while (i < expr.length && /[a-zA-Z0-9]/.test(expr[i])) s += expr[i++];
        if (funcs[s]) tokens.push({ t: "func", v: s }); else if (consts[s] !== undefined) tokens.push({ t: "num", v: consts[s] }); else throw "err"; continue; }
      if ("+-*/^%()".includes(c)) { tokens.push({ t: "op", v: c }); i++; continue; }
      throw "err";
    }
    // handle unary minus
    const out = [], ops = [];
    const prec = { "+":1, "-":1, "*":2, "/":2, "%":2, "^":3, "u":4 };
    const rightAssoc = { "^":true, "u":true };
    let prev = null;
    for (const tk of tokens) {
      if (tk.t === "num") out.push(tk);
      else if (tk.t === "func") ops.push(tk);
      else if (tk.t === "op") {
        if (tk.v === "(") ops.push(tk);
        else if (tk.v === ")") {
          while (ops.length && ops[ops.length-1].v !== "(") out.push(ops.pop());
          ops.pop();
          if (ops.length && ops[ops.length-1].t === "func") out.push(ops.pop());
        } else {
          let op = tk.v;
          if (op === "-" && (prev === null || (prev.t === "op" && prev.v !== ")"))) op = "u";
          while (ops.length) {
            const top = ops[ops.length-1];
            if (top.t === "func") { out.push(ops.pop()); continue; }
            if (top.t === "op" && top.v !== "(" && (prec[top.v] > prec[op] || (prec[top.v] === prec[op] && !rightAssoc[op]))) out.push(ops.pop());
            else break;
          }
          ops.push({ t: "op", v: op });
        }
      }
      prev = tk;
    }
    while (ops.length) out.push(ops.pop());
    const st = [];
    for (const tk of out) {
      if (tk.t === "num") st.push(tk.v);
      else if (tk.t === "func") st.push(funcs[tk.v](st.pop()));
      else if (tk.v === "u") st.push(-st.pop());
      else { const b = st.pop(), a = st.pop();
        st.push(tk.v === "+" ? a+b : tk.v === "-" ? a-b : tk.v === "*" ? a*b : tk.v === "/" ? a/b : tk.v === "%" ? a%b : Math.pow(a,b)); }
    }
    const r = st.pop();
    if (r === undefined || Number.isNaN(r)) throw "err";
    return r;
  }

  /* ---------- Basic scientific calculator ---------- */
  function initBasic(root) {
    const disp = root.querySelector("#calcDisplay");
    const sub = root.querySelector("#calcSub");
    let expr = "";
    const render = () => { disp.textContent = expr || "0"; };
    root.querySelectorAll(".keypad button").forEach(btn => {
      btn.addEventListener("click", () => {
        const a = btn.dataset.act, v = btn.dataset.val;
        if (a === "clear") { expr = ""; sub.textContent = ""; }
        else if (a === "del") expr = expr.slice(0, -1);
        else if (a === "eq") {
          try { const r = evalExpr(expr); sub.textContent = expr + " ="; expr = String(Math.round(r * 1e10) / 1e10); }
          catch { sub.textContent = "Fehler"; }
        } else expr += v;
        render();
      });
    });
    render();
  }

  /* ---------- Percentage calculator ---------- */
  function initPercent(root) {
    const G = root.querySelector("#pG"), P = root.querySelector("#pP"), W = root.querySelector("#pW");
    const res = root.querySelector("#pResult");
    root.querySelector("#pCalc").addEventListener("click", () => {
      const g = parseFloat(G.value), p = parseFloat(P.value), w = parseFloat(W.value);
      let out = "";
      if (!isNaN(g) && !isNaN(p)) out = `${t("result")}: <span class="cr-val">${round(g*p/100)}</span> (${p}% von ${g})`;
      else if (!isNaN(w) && !isNaN(g)) out = `${t("result")}: <span class="cr-val">${round(w/g*100)}%</span>`;
      else if (!isNaN(w) && !isNaN(p)) out = `${t("result")}: <span class="cr-val">${round(w/p*100)}</span> (Grundwert)`;
      else out = "Bitte zwei Werte eingeben.";
      res.innerHTML = out;
    });
  }

  /* ---------- Fraction calculator ---------- */
  function initFraction(root) {
    const els = ["fa","fb","fc","fd"].map(id => root.querySelector("#" + id));
    const op = root.querySelector("#fOp"), res = root.querySelector("#fResult");
    root.querySelector("#fCalc").addEventListener("click", () => {
      const [a,b,c,d] = els.map(e => parseInt(e.value, 10));
      if ([a,b,c,d].some(x => isNaN(x)) || b === 0 || d === 0) { res.textContent = "Ungültige Eingabe."; return; }
      let n, den;
      switch (op.value) {
        case "+": n = a*d + c*b; den = b*d; break;
        case "-": n = a*d - c*b; den = b*d; break;
        case "*": n = a*c; den = b*d; break;
        case "/": n = a*d; den = b*c; break;
      }
      const g = gcd(n, den); n /= g; den /= g;
      if (den < 0) { n = -n; den = -den; }
      res.innerHTML = `${t("result")}: <span class="cr-val">${n}/${den}</span> ≈ ${round(n/den)}`;
    });
  }

  /* ---------- Quadratic equation solver ---------- */
  function initEquation(root) {
    const A = root.querySelector("#eA"), B = root.querySelector("#eB"), C = root.querySelector("#eC");
    const res = root.querySelector("#eResult");
    root.querySelector("#eCalc").addEventListener("click", () => {
      const a = parseFloat(A.value), b = parseFloat(B.value), c = parseFloat(C.value);
      if (isNaN(a) || isNaN(b) || isNaN(c)) { res.textContent = "Bitte a, b, c eingeben."; return; }
      if (a === 0) { if (b === 0) { res.textContent = "Keine Gleichung."; return; }
        res.innerHTML = `Linear: <span class="cr-val">x = ${round(-c/b)}</span>`; return; }
      const D = b*b - 4*a*c;
      if (D < 0) res.innerHTML = `D = ${round(D)} &lt; 0 → keine reelle Lösung.`;
      else if (D === 0) res.innerHTML = `D = 0 → <span class="cr-val">x = ${round(-b/(2*a))}</span>`;
      else { const x1 = (-b + Math.sqrt(D))/(2*a), x2 = (-b - Math.sqrt(D))/(2*a);
        res.innerHTML = `D = ${round(D)} → <span class="cr-val">x₁ = ${round(x1)}, x₂ = ${round(x2)}</span>`; }
    });
  }

  /* ---------- Geometry calculator ---------- */
  function initGeometry(root) {
    const shape = root.querySelector("#gShape"), fields = root.querySelector("#gFields"), res = root.querySelector("#gResult");
    const shapes = {
      rectangle: { label:{de:"Rechteck (a·b)",en:"Rectangle"}, in:[["a","a"],["b","b"]], calc:(v)=>`A = ${round(v.a*v.b)}, U = ${round(2*(v.a+v.b))}` },
      circle: { label:{de:"Kreis (r)",en:"Circle"}, in:[["r","r"]], calc:(v)=>`A = ${round(Math.PI*v.r*v.r)}, U = ${round(2*Math.PI*v.r)}` },
      triangle: { label:{de:"Dreieck (g,h)",en:"Triangle"}, in:[["g","Grundseite g"],["h","Höhe h"]], calc:(v)=>`A = ${round(0.5*v.g*v.h)}` },
      cuboid: { label:{de:"Quader (a,b,c)",en:"Cuboid"}, in:[["a","a"],["b","b"],["c","c"]], calc:(v)=>`V = ${round(v.a*v.b*v.c)}, O = ${round(2*(v.a*v.b+v.a*v.c+v.b*v.c))}` },
      cylinder: { label:{de:"Zylinder (r,h)",en:"Cylinder"}, in:[["r","r"],["h","h"]], calc:(v)=>`V = ${round(Math.PI*v.r*v.r*v.h)}, O = ${round(2*Math.PI*v.r*(v.r+v.h))}` },
      sphere: { label:{de:"Kugel (r)",en:"Sphere"}, in:[["r","r"]], calc:(v)=>`V = ${round(4/3*Math.PI*Math.pow(v.r,3))}, O = ${round(4*Math.PI*v.r*v.r)}` }
    };
    const lang = window.MM_lang ? window.MM_lang() : "de";
    shape.innerHTML = Object.entries(shapes).map(([k,s]) => `<option value="${k}">${s.label[lang]||s.label.de}</option>`).join("");
    function build() {
      const s = shapes[shape.value];
      fields.innerHTML = s.in.map(([k,lbl]) => `<div class="field"><label>${lbl}</label><input type="number" data-k="${k}" step="any"></div>`).join("");
      res.textContent = "";
    }
    shape.addEventListener("change", build);
    root.querySelector("#gCalc").addEventListener("click", () => {
      const s = shapes[shape.value]; const v = {};
      let ok = true;
      fields.querySelectorAll("input").forEach(inp => { const n = parseFloat(inp.value); if (isNaN(n)) ok = false; v[inp.dataset.k] = n; });
      if (!ok) { res.textContent = "Bitte alle Werte eingeben."; return; }
      res.innerHTML = `<span class="cr-val" style="font-size:1.05rem">${s.calc(v)}</span>`;
    });
    build();
  }

  function round(x) { return Math.round(x * 10000) / 10000; }

  window.MM_CALC = { initBasic, initPercent, initFraction, initEquation, initGeometry, evalExpr };
})();
