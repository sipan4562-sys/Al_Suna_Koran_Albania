/* ============================================================
   IRAK — العراق — Art Library
   Handgezeichnete SVG-Illustrationen: 10 Gerichte (originalgetreu,
   mit Dampf & Details), 9 Stadt-Wahrzeichen, 20 Themen-Icons.
   Keine externen Bilder — alles Vektor, alles animierbar.
   ============================================================ */
window.ART = (function () {
  "use strict";

  /* ---------- Wiederverwendbare Bausteine ---------- */

  // Teller mit Goldrand + Schatten (P = Präfix für eindeutige Gradient-IDs)
  function plate(P) {
    return `
      <defs>
        <radialGradient id="${P}pl" cx="0.42" cy="0.3" r="0.9">
          <stop offset="0" stop-color="#fffdf4"/>
          <stop offset="0.55" stop-color="#efe8d3"/>
          <stop offset="1" stop-color="#c4bb9e"/>
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="154" rx="76" ry="10" fill="rgba(3,5,14,0.5)"/>
      <ellipse cx="100" cy="136" rx="84" ry="25" fill="url(#${P}pl)" stroke="#c9a24d" stroke-width="1.5"/>
      <ellipse cx="100" cy="134" rx="63" ry="17" fill="#e7e0ca"/>`;
  }

  function steam(x1, x2, x3, y) {
    y = y || 66;
    const p = (x) => `<path d="M${x} ${y} C${x - 5} ${y - 9} ${x + 5} ${y - 15} ${x} ${y - 26}" fill="none" stroke-width="4" stroke-linecap="round"/>`;
    return `<g class="steam">${p(x1)}${p(x2)}${x3 ? p(x3) : ""}</g>`;
  }

  const wrap = (inner) => `<svg viewBox="0 0 200 170" aria-hidden="true">${inner}</svg>`;
  const cwrap = (inner) => `<svg viewBox="0 0 340 140" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${inner}</svg>`;

  /* ============================================================
     GERICHTE
     ============================================================ */
  const dish = {};

  /* --- Masgouf: aufgeklappter Karpfen, Grillstreifen, Zitrone, Tomate --- */
  dish.masgouf = wrap(`
    ${plate("mg")}
    <defs>
      <linearGradient id="mgSkin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a4652c"/><stop offset="1" stop-color="#6e3f16"/>
      </linearGradient>
      <radialGradient id="mgFlesh" cx="0.5" cy="0.4" r="0.8">
        <stop offset="0" stop-color="#f3b164"/><stop offset="1" stop-color="#cf7d2e"/>
      </radialGradient>
      <radialGradient id="mgLem" cx="0.5" cy="0.45" r="0.75">
        <stop offset="0" stop-color="#fdf6b8"/><stop offset="1" stop-color="#eecf39"/>
      </radialGradient>
      <radialGradient id="mgTom" cx="0.4" cy="0.35" r="0.85">
        <stop offset="0" stop-color="#f2795c"/><stop offset="1" stop-color="#bb3524"/>
      </radialGradient>
    </defs>
    <g transform="rotate(-4 100 112)">
      <path d="M166 100 L190 86 L186 114 Z" fill="url(#mgSkin)"/>
      <path d="M28 112 C40 82 158 82 172 112 C158 138 40 138 28 112 Z" fill="url(#mgSkin)"/>
      <path d="M40 112 C52 90 150 90 162 112 C150 132 52 132 40 112 Z" fill="url(#mgFlesh)"/>
      <line x1="46" y1="112" x2="158" y2="112" stroke="#b05f1f" stroke-width="3" opacity="0.7"/>
      <g fill="none" stroke="rgba(140,70,20,0.55)" stroke-width="2">
        <path d="M62 96 C60 106 60 118 62 128"/><path d="M82 93 C80 104 80 120 82 130"/>
        <path d="M102 92 C100 104 100 120 102 131"/><path d="M122 93 C120 104 120 120 122 130"/>
        <path d="M142 96 C140 106 140 118 142 128"/>
      </g>
      <g stroke="rgba(58,24,4,0.8)" stroke-width="3.4" stroke-linecap="round">
        <line x1="56" y1="101" x2="70" y2="99"/><line x1="90" y1="98" x2="106" y2="97"/>
        <line x1="126" y1="99" x2="141" y2="101"/><line x1="72" y1="123" x2="88" y2="125"/>
        <line x1="112" y1="125" x2="128" y2="123"/>
      </g>
      <ellipse cx="82" cy="101" rx="26" ry="6" fill="rgba(255,255,255,0.28)" transform="rotate(-6 82 101)"/>
      <path d="M28 112 C34 98 44 92 54 89 C46 104 46 122 54 135 C44 132 34 126 28 112 Z" fill="#7c4a1c"/>
      <circle cx="40" cy="106" r="3" fill="#2b1608"/><circle cx="41" cy="105" r="1" fill="#f3e0c0"/>
    </g>
    <circle cx="138" cy="144" r="11" fill="url(#mgLem)" stroke="#e0be24" stroke-width="1.5"/>
    <circle cx="156" cy="139" r="13" fill="url(#mgLem)" stroke="#e0be24" stroke-width="1.5"/>
    <g stroke="rgba(255,255,255,0.85)" stroke-width="1.4">
      <line x1="156" y1="128" x2="156" y2="150"/><line x1="145" y1="139" x2="167" y2="139"/>
      <line x1="148" y1="131" x2="164" y2="147"/><line x1="164" y1="131" x2="148" y2="147"/>
    </g>
    <circle cx="58" cy="143" r="10" fill="url(#mgTom)"/>
    <ellipse cx="55" cy="139" rx="4" ry="2.5" fill="rgba(255,255,255,0.45)"/>
    <g stroke="#3f7a2c" stroke-width="2.4" stroke-linecap="round">
      <path d="M84 146 q4 -7 9 -8"/><path d="M90 148 q5 -5 11 -5"/>
    </g>
    ${steam(86, 104, 120)}`);

  /* --- Dolma: Pyramide gefüllter Weinblätter + Paprika + Zwiebel --- */
  dish.dolma = wrap(`
    ${plate("dl")}
    <defs>
      <linearGradient id="dlLeaf" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5f8f3e"/><stop offset="1" stop-color="#2f5620"/>
      </linearGradient>
      <radialGradient id="dlPep" cx="0.4" cy="0.32" r="0.85">
        <stop offset="0" stop-color="#f6a54b"/><stop offset="1" stop-color="#cf5e1a"/>
      </radialGradient>
      <radialGradient id="dlOn" cx="0.42" cy="0.35" r="0.85">
        <stop offset="0" stop-color="#e9cd85"/><stop offset="1" stop-color="#ad8639"/>
      </radialGradient>
    </defs>
    <g>
      ${[
        [40, 120, -3], [72, 122, 2], [104, 121, -2], [136, 120, 3],
        [56, 107, 2], [88, 108, -3], [120, 107, 2],
        [72, 94, -2], [104, 95, 2]
      ].map(([x, y, r]) => `
        <g transform="rotate(${r} ${x + 15} ${y + 7})">
          <rect x="${x}" y="${y}" width="30" height="15" rx="7.5" fill="url(#dlLeaf)"/>
          <path d="M${x + 5} ${y + 4} q10 -3 20 0" stroke="rgba(220,245,190,0.4)" stroke-width="1.5" fill="none"/>
          <path d="M${x + 5} ${y + 10} q10 3 20 0" stroke="rgba(20,50,10,0.4)" stroke-width="1.5" fill="none"/>
          <ellipse cx="${x + 3.5}" cy="${y + 7.5}" rx="3.5" ry="6" fill="#7fae59"/>
        </g>`).join("")}
      <ellipse cx="100" cy="98" rx="42" ry="10" fill="rgba(255,255,255,0.14)"/>
    </g>
    <circle cx="52" cy="92" r="15" fill="url(#dlPep)"/>
    <path d="M52 78 q-2 -6 4 -8" stroke="#3f7a2c" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="47" cy="86" rx="4.5" ry="3" fill="rgba(255,255,255,0.4)"/>
    <circle cx="148" cy="92" r="14" fill="url(#dlOn)"/>
    <g fill="none" stroke="rgba(120,80,20,0.5)" stroke-width="1.5">
      <path d="M138 86 q10 -6 20 0"/><path d="M136 92 q12 -7 24 0"/>
    </g>
    <ellipse cx="143" cy="85" rx="4" ry="2.6" fill="rgba(255,255,255,0.4)"/>
    ${steam(88, 112)}`);

  /* --- Kubba: Torpedo-Kroketten, eine aufgeschnitten, Petersilie --- */
  dish.kubba = wrap(`
    ${plate("kb")}
    <defs>
      <linearGradient id="kbCr" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#cd8f49"/><stop offset="1" stop-color="#7c4b1e"/>
      </linearGradient>
      <radialGradient id="kbIn" cx="0.5" cy="0.5" r="0.7">
        <stop offset="0" stop-color="#6d4525"/><stop offset="1" stop-color="#4a2c12"/>
      </radialGradient>
    </defs>
    <g transform="rotate(-12 76 103)">
      <path d="M44 103 C56 88 96 88 108 103 C96 118 56 118 44 103 Z" fill="url(#kbCr)"/>
      <ellipse cx="66" cy="99" rx="14" ry="4" fill="rgba(255,240,210,0.3)"/>
    </g>
    <g transform="rotate(10 128 100)">
      <path d="M96 100 C108 85 148 85 160 100 C148 115 108 115 96 100 Z" fill="url(#kbCr)"/>
      <ellipse cx="120" cy="96" rx="14" ry="4" fill="rgba(255,240,210,0.3)"/>
    </g>
    <g fill="rgba(90,50,15,0.55)">
      <circle cx="60" cy="104" r="1.4"/><circle cx="74" cy="98" r="1.4"/><circle cx="88" cy="106" r="1.4"/>
      <circle cx="112" cy="98" r="1.4"/><circle cx="128" cy="94" r="1.4"/><circle cx="144" cy="100" r="1.4"/>
    </g>
    <g transform="rotate(-4 96 133)">
      <path d="M58 133 C68 119 100 119 110 133 C100 147 68 147 58 133 Z" fill="url(#kbCr)"/>
      <ellipse cx="108" cy="133" rx="13" ry="12" fill="#dcc9a2"/>
      <circle cx="108" cy="133" r="7.5" fill="url(#kbIn)"/>
      <circle cx="105" cy="130" r="1.6" fill="#efe0ae"/><circle cx="111" cy="134" r="1.6" fill="#efe0ae"/>
      <circle cx="107" cy="137" r="1.4" fill="#efe0ae"/>
    </g>
    <g fill="#3f7a2c">
      <circle cx="146" cy="128" r="3"/><circle cx="152" cy="124" r="2.6"/><circle cx="152" cy="131" r="2.4"/>
      <circle cx="48" cy="124" r="2.8"/><circle cx="43" cy="129" r="2.4"/>
    </g>
    <path d="M156 142 a13 13 0 0 1 13 -9 l-2 12 Z" fill="#f4d94a" stroke="#e0be24" stroke-width="1.4"/>
    ${steam(90, 110)}`);

  /* --- Quzi: Reisberg mit Safran, Lammkeule, Mandeln, Rosinen --- */
  dish.quzi = wrap(`
    ${plate("qz")}
    <defs>
      <linearGradient id="qzRice" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f7dd85"/><stop offset="1" stop-color="#d9a83a"/>
      </linearGradient>
      <linearGradient id="qzMeat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#b06f34"/><stop offset="1" stop-color="#6b3a14"/>
      </linearGradient>
    </defs>
    <path d="M28 132 C34 98 166 98 172 132 C130 142 60 142 28 132 Z" fill="url(#qzRice)"/>
    <g fill="#e69b2e" opacity="0.65">
      <ellipse cx="66" cy="118" rx="12" ry="5"/><ellipse cx="128" cy="124" rx="14" ry="5"/>
      <ellipse cx="98" cy="130" rx="10" ry="4"/>
    </g>
    <g stroke="rgba(255,250,225,0.6)" stroke-width="1.6" stroke-linecap="round">
      <line x1="48" y1="122" x2="53" y2="120"/><line x1="62" y1="128" x2="67" y2="126"/>
      <line x1="80" y1="116" x2="85" y2="114"/><line x1="96" y1="122" x2="101" y2="120"/>
      <line x1="114" y1="114" x2="119" y2="112"/><line x1="132" y1="120" x2="137" y2="118"/>
      <line x1="148" y1="126" x2="153" y2="124"/><line x1="70" y1="108" x2="75" y2="106"/>
      <line x1="122" y1="106" x2="127" y2="104"/>
    </g>
    <g fill="#f4ecd4" stroke="#d9c996" stroke-width="0.8">
      <ellipse cx="58" cy="114" rx="4" ry="2"/><ellipse cx="90" cy="126" rx="4" ry="2"/>
      <ellipse cx="118" cy="120" rx="4" ry="2"/><ellipse cx="146" cy="118" rx="4" ry="2"/>
      <ellipse cx="76" cy="132" rx="4" ry="2"/>
    </g>
    <g fill="#4a2a12">
      <ellipse cx="68" cy="122" rx="2.4" ry="1.6"/><ellipse cx="104" cy="116" rx="2.4" ry="1.6"/>
      <ellipse cx="136" cy="128" rx="2.4" ry="1.6"/><ellipse cx="86" cy="110" rx="2.4" ry="1.6"/>
    </g>
    <path d="M82 74 C76 96 118 102 128 78 C128 58 90 52 82 74 Z" fill="url(#qzMeat)"/>
    <g fill="none" stroke="rgba(60,28,8,0.5)" stroke-width="2">
      <path d="M90 70 q10 8 24 6"/><path d="M88 82 q12 8 28 4"/>
    </g>
    <ellipse cx="96" cy="66" rx="10" ry="4" fill="rgba(255,225,180,0.35)"/>
    <g transform="rotate(-32 134 58)">
      <rect x="122" y="53" width="26" height="8" rx="4" fill="#efe6cf"/>
      <circle cx="149" cy="53" r="5" fill="#f7f0dd"/><circle cx="149" cy="61" r="5" fill="#f7f0dd"/>
    </g>
    ${steam(84, 102, 120, 60)}`);

  /* --- Biryani: bunter Reis mit Erbsen, Kartoffeln, Huhn, Nudeln --- */
  dish.biryani = wrap(`
    ${plate("br")}
    <defs>
      <linearGradient id="brRice" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f4d06c"/><stop offset="1" stop-color="#d5a032"/>
      </linearGradient>
      <radialGradient id="brChk" cx="0.4" cy="0.32" r="0.85">
        <stop offset="0" stop-color="#cf8a44"/><stop offset="1" stop-color="#8e5620"/>
      </radialGradient>
    </defs>
    <path d="M26 128 C40 102 160 102 174 128 C130 140 70 140 26 128 Z" fill="url(#brRice)"/>
    <g fill="none" stroke="#8a5a22" stroke-width="2" stroke-linecap="round" opacity="0.8">
      <path d="M60 112 q10 -8 22 -2 q8 4 16 -2"/><path d="M96 120 q12 -7 24 0"/>
      <path d="M74 126 q8 -6 18 -3"/>
    </g>
    <ellipse cx="140" cy="110" rx="19" ry="13" fill="url(#brChk)"/>
    <path d="M128 104 q10 -6 22 -1" stroke="rgba(255,230,190,0.5)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <g fill="#5f9a3d">
      <circle cx="56" cy="120" r="3.4"/><circle cx="78" cy="112" r="3.4"/><circle cx="96" cy="126" r="3.4"/>
      <circle cx="116" cy="116" r="3.4"/><circle cx="70" cy="130" r="3.4"/><circle cx="106" cy="108" r="3.4"/>
    </g>
    <g fill="#3c6b24">
      <circle cx="57" cy="119" r="1.1"/><circle cx="79" cy="111" r="1.1"/><circle cx="97" cy="125" r="1.1"/>
      <circle cx="117" cy="115" r="1.1"/>
    </g>
    <g fill="#eec547" stroke="#c99a25" stroke-width="1">
      <rect x="62" y="122" width="9" height="9" rx="1.5" transform="rotate(12 66 126)"/>
      <rect x="88" y="114" width="9" height="9" rx="1.5" transform="rotate(-10 92 118)"/>
      <rect x="118" y="124" width="9" height="9" rx="1.5" transform="rotate(8 122 128)"/>
    </g>
    <g fill="#4a2a12">
      <ellipse cx="86" cy="128" rx="2.4" ry="1.6"/><ellipse cx="108" cy="120" rx="2.4" ry="1.6"/>
      <ellipse cx="64" cy="112" rx="2.4" ry="1.6"/>
    </g>
    <g stroke="#f6efd8" stroke-width="2.6" stroke-linecap="round">
      <line x1="72" y1="118" x2="78" y2="116"/><line x1="100" y1="112" x2="106" y2="110"/>
      <line x1="124" y1="118" x2="130" y2="116"/>
    </g>
    <g stroke="#d94f35" stroke-width="3" stroke-linecap="round">
      <path d="M50 126 q6 -4 12 -2"/><path d="M148 124 q6 -3 11 -1"/>
    </g>
    ${steam(88, 108, null, 62)}`);

  /* --- Tashreeb: Lapis-Schale, Brühe, Brotstücke, Kichererbsen --- */
  dish.tashreeb = wrap(`
    <defs>
      <linearGradient id="tsBowl" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2e4fa5"/><stop offset="1" stop-color="#14245a"/>
      </linearGradient>
      <radialGradient id="tsBroth" cx="0.45" cy="0.35" r="0.85">
        <stop offset="0" stop-color="#dda44e"/><stop offset="1" stop-color="#a06322"/>
      </radialGradient>
    </defs>
    <ellipse cx="100" cy="152" rx="66" ry="10" fill="rgba(3,5,14,0.5)"/>
    <path d="M32 96 C34 132 72 148 100 148 C128 148 166 132 168 96 Z" fill="url(#tsBowl)"/>
    <ellipse cx="100" cy="96" rx="68" ry="16" fill="#1b2f6b"/>
    <ellipse cx="100" cy="96" rx="68" ry="16" fill="none" stroke="#d3ab55" stroke-width="2.4"/>
    <g fill="#d3ab55" opacity="0.85">
      <circle cx="62" cy="122" r="2.2"/><circle cx="81" cy="130" r="2.2"/><circle cx="100" cy="133" r="2.2"/>
      <circle cx="119" cy="130" r="2.2"/><circle cx="138" cy="122" r="2.2"/>
    </g>
    <ellipse cx="100" cy="96" rx="60" ry="12.5" fill="url(#tsBroth)"/>
    <path d="M52 92 q20 -7 44 -3" stroke="rgba(255,235,190,0.5)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <g fill="#e8d3a3" stroke="#c3a267" stroke-width="1">
      <path d="M62 92 l16 -6 l10 7 l-14 6 Z"/>
      <path d="M100 86 l18 -3 l6 8 l-16 5 Z"/>
      <path d="M126 94 l14 -6 l8 6 l-12 6 Z"/>
      <path d="M84 97 l12 -3 l6 6 l-12 3 Z" opacity="0.9"/>
    </g>
    <g fill="#eddc9a">
      <circle cx="70" cy="99" r="3"/><circle cx="96" cy="101" r="3"/><circle cx="120" cy="99" r="3"/>
      <circle cx="108" cy="94" r="2.6"/><circle cx="84" cy="90" r="2.6"/>
    </g>
    ${steam(80, 100, 120, 74)}`);

  /* --- Samoon: rautenförmige Brote auf Tuch, eines aufgeschnitten --- */
  dish.samoon = wrap(`
    <defs>
      <radialGradient id="smBr" cx="0.42" cy="0.3" r="0.9">
        <stop offset="0" stop-color="#eec572"/><stop offset="1" stop-color="#a5671f"/>
      </radialGradient>
    </defs>
    <ellipse cx="100" cy="152" rx="78" ry="10" fill="rgba(3,5,14,0.5)"/>
    <ellipse cx="100" cy="136" rx="86" ry="24" fill="#ddd3ba"/>
    <g fill="none" stroke="rgba(120,110,80,0.45)" stroke-width="1.5">
      <path d="M32 132 q30 12 66 10"/><path d="M108 144 q34 0 58 -12"/>
    </g>
    <g transform="rotate(-22 68 96)">
      <path d="M22 96 C40 76 96 76 114 96 C96 116 40 116 22 96 Z" fill="url(#smBr)"/>
      <path d="M34 96 q34 -8 68 0" stroke="rgba(255,240,205,0.55)" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>
    <g transform="rotate(7 112 120)">
      <path d="M62 120 C82 98 142 98 162 120 C142 142 82 142 62 120 Z" fill="url(#smBr)"/>
      <path d="M76 120 q36 -9 72 0" stroke="rgba(255,240,205,0.55)" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <g fill="rgba(90,50,12,0.5)">
        <circle cx="94" cy="114" r="1.3"/><circle cx="116" cy="110" r="1.3"/><circle cx="136" cy="116" r="1.3"/>
        <circle cx="106" cy="126" r="1.3"/><circle cx="126" cy="124" r="1.3"/>
      </g>
    </g>
    <g transform="rotate(-6 56 130)">
      <path d="M20 130 C32 116 74 116 88 130 C74 144 32 144 20 130 Z" fill="url(#smBr)"/>
      <ellipse cx="54" cy="130" rx="26" ry="9" fill="#f6ecd4"/>
      <g fill="rgba(190,160,110,0.7)">
        <circle cx="44" cy="128" r="1.6"/><circle cx="56" cy="132" r="1.6"/><circle cx="66" cy="128" r="1.6"/>
        <circle cx="50" cy="134" r="1.2"/><circle cx="62" cy="126" r="1.2"/>
      </g>
    </g>
    <g stroke="#c9a24d" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M164 92 q4 -18 2 -34"/>
      <g fill="#d9b25a" stroke="none">
        <ellipse cx="160" cy="66" rx="3" ry="6" transform="rotate(-24 160 66)"/>
        <ellipse cx="170" cy="62" rx="3" ry="6" transform="rotate(24 170 62)"/>
        <ellipse cx="158" cy="76" rx="3" ry="6" transform="rotate(-24 158 76)"/>
        <ellipse cx="172" cy="72" rx="3" ry="6" transform="rotate(24 172 72)"/>
        <ellipse cx="165" cy="54" rx="3" ry="6"/>
      </g>
    </g>`);

  /* --- Kahi & Geymar: Blätterteig-Stapel mit Sirup + Rahm --- */
  dish.kahi = wrap(`
    ${plate("kg")}
    <defs>
      <linearGradient id="kgP" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#eec46d"/><stop offset="1" stop-color="#bd8631"/>
      </linearGradient>
      <linearGradient id="kgSyr" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d98f2e"/><stop offset="1" stop-color="#8a4d12"/>
      </linearGradient>
    </defs>
    <g>
      <rect x="58" y="116" width="104" height="16" rx="6" fill="url(#kgP)"/>
      <rect x="62" y="102" width="98" height="15" rx="6" fill="url(#kgP)"/>
      <rect x="66" y="88" width="92" height="15" rx="6" fill="url(#kgP)"/>
      <g stroke="rgba(120,70,20,0.4)" stroke-width="1.4">
        <line x1="64" y1="124" x2="156" y2="124"/><line x1="68" y1="110" x2="154" y2="110"/>
        <line x1="72" y1="96" x2="152" y2="96"/>
      </g>
      <ellipse cx="104" cy="90" rx="30" ry="4.5" fill="rgba(255,244,214,0.5)"/>
      <path d="M70 90 q4 16 10 0 q4 14 9 1 M120 89 q5 15 10 1 q4 12 9 0" fill="none" stroke="url(#kgSyr)" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
      <path d="M76 132 q3 9 7 0 M142 132 q3 10 7 0" fill="none" stroke="url(#kgSyr)" stroke-width="5" stroke-linecap="round"/>
    </g>
    <ellipse cx="40" cy="142" rx="27" ry="9" fill="#f0e9d5" stroke="#c9a24d" stroke-width="1.3"/>
    <path d="M22 138 c-3 -10 9 -15 16 -9 c3 -8 18 -7 19 1 c7 -2 11 5 6 9 c-12 5 -30 5 -41 -1 Z" fill="#fbf7ea"/>
    <path d="M26 138 q14 6 32 1" stroke="#e3d7ba" stroke-width="2" fill="none"/>
    ${steam(104, 122, null, 78)}`);

  /* --- Kleicha: Spiral-Kekse mit Dattelfüllung + Halbmond --- */
  dish.kleicha = wrap(`
    ${plate("kl")}
    <defs>
      <radialGradient id="klC" cx="0.42" cy="0.32" r="0.9">
        <stop offset="0" stop-color="#e7c184"/><stop offset="1" stop-color="#b0803c"/>
      </radialGradient>
    </defs>
    ${[
      [66, 110], [102, 102], [136, 112], [86, 130]
    ].map(([x, y]) => `
      <circle cx="${x}" cy="${y}" r="16" fill="url(#klC)" stroke="#9a6a2f" stroke-width="1.2"/>
      <path d="M${x + 9} ${y} a9 9 0 1 1 -9 -9 a6 6 0 1 1 -6 6 a3.2 3.2 0 1 0 3.2 -3.2"
            fill="none" stroke="#6b3d18" stroke-width="2.8" stroke-linecap="round" opacity="0.9"/>`).join("")}
    <path d="M150 138 a14 14 0 0 1 14 -14 a11 11 0 0 0 -14 14 Z" fill="url(#klC)" stroke="#9a6a2f" stroke-width="1.2"/>
    <path d="M150 136 a12 12 0 0 1 11 -11" fill="none" stroke="#6b3d18" stroke-width="1.6" opacity="0.6"/>
    <ellipse cx="52" cy="136" rx="7" ry="5" fill="#5a3416"/>
    <ellipse cx="50" cy="134" rx="2.5" ry="1.5" fill="rgba(255,220,170,0.4)"/>
    <g fill="rgba(255,255,255,0.85)">
      <circle cx="70" cy="102" r="1.2"/><circle cx="98" cy="96" r="1.2"/><circle cx="128" cy="104" r="1.2"/>
      <circle cx="90" cy="122" r="1.2"/><circle cx="112" cy="116" r="1.2"/><circle cx="142" cy="122" r="1.2"/>
      <circle cx="78" cy="140" r="1.2"/><circle cx="120" cy="134" r="1.2"/>
    </g>`);

  /* --- Chai: Istikan-Glas auf Untertasse, Löffel, Zuckerwürfel --- */
  dish.chai = wrap(`
    <defs>
      <linearGradient id="chTea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d47a1e"/><stop offset="1" stop-color="#7e3c0a"/>
      </linearGradient>
      <linearGradient id="chGl" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="rgba(255,255,255,0.45)"/><stop offset="0.5" stop-color="rgba(255,255,255,0.08)"/>
        <stop offset="1" stop-color="rgba(255,255,255,0.3)"/>
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="154" rx="66" ry="10" fill="rgba(3,5,14,0.5)"/>
    <ellipse cx="100" cy="144" rx="56" ry="13" fill="#f2ecd9" stroke="#c9a24d" stroke-width="1.6"/>
    <ellipse cx="100" cy="142" rx="38" ry="8.5" fill="#e2dac2"/>
    <g transform="rotate(24 148 140)">
      <rect x="130" y="138" width="34" height="3.6" rx="1.8" fill="#cdd2da"/>
      <ellipse cx="167" cy="140" rx="7" ry="4.6" fill="#dbe0e8"/>
    </g>
    <g fill="#fbfaf3" stroke="#d9d2ba" stroke-width="1">
      <rect x="52" y="132" width="11" height="9" rx="1.5" transform="rotate(-8 57 136)"/>
      <rect x="64" y="136" width="11" height="9" rx="1.5" transform="rotate(6 69 140)"/>
    </g>
    <path d="M80 64 C80 88 91 94 91 106 C91 120 80 128 82 142 L118 142 C120 128 109 120 109 106 C109 94 120 88 120 64 Z"
          fill="url(#chGl)" stroke="rgba(255,255,255,0.35)" stroke-width="1.4"/>
    <path d="M84 74 C84 90 93 96 93 106 C93 119 84 127 85.5 139 L114.5 139 C116 127 107 119 107 106 C107 96 116 90 116 74 Z"
          fill="url(#chTea)"/>
    <ellipse cx="100" cy="75" rx="15.5" ry="4" fill="#e9932f"/>
    <ellipse cx="100" cy="64" rx="20" ry="4.6" fill="none" stroke="#d9b25a" stroke-width="2.6"/>
    <path d="M86 72 C86 90 94 96 94 108" stroke="rgba(255,255,255,0.5)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${steam(92, 108, null, 52)}`);

  /* ============================================================
     STADT-WAHRZEICHEN (Banner 340×140)
     ============================================================ */
  const city = {};

  const tw = (x, y, r) => `<circle class="tw" cx="${x}" cy="${y}" r="${r || 1.6}" fill="#e8e2c8"/>`;
  const GOLD = `<linearGradient id="cGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3d492"/><stop offset="1" stop-color="#b9862f"/>
    </linearGradient>`;

  /* --- Bagdad: Kuppel, Minarette, Palme, Tigris --- */
  city.baghdad = cwrap(`
    <defs>${GOLD}</defs>
    ${tw(60, 30)}${tw(120, 20)}${tw(250, 24)}${tw(300, 44)}
    <path d="M296 22 a13 13 0 1 0 9 22 a10 10 0 1 1 -9 -22 Z" fill="#f2d98c"/>
    <g fill="#22397c">
      <rect x="34" y="88" width="30" height="34"/><rect x="70" y="96" width="24" height="26"/>
      <rect x="238" y="92" width="26" height="30"/><rect x="270" y="84" width="34" height="38"/>
    </g>
    <g fill="#e8c877">
      <rect x="42" y="94" width="4" height="5"/><rect x="52" y="94" width="4" height="5"/>
      <rect x="76" y="102" width="4" height="5"/><rect x="246" y="98" width="4" height="5"/>
      <rect x="278" y="92" width="4" height="5" class="tw"/><rect x="290" y="92" width="4" height="5"/>
      <rect x="278" y="104" width="4" height="5"/><rect x="46" y="106" width="4" height="5" class="tw"/>
    </g>
    <rect x="128" y="94" width="44" height="28" fill="url(#cGold)"/>
    <path d="M150 46 C170 56 175 80 150 94 C125 80 130 56 150 46 Z" fill="url(#cGold)"/>
    <line x1="150" y1="46" x2="150" y2="36" stroke="#e8c877" stroke-width="2"/>
    <circle cx="150" cy="34" r="2.6" fill="none" stroke="#e8c877" stroke-width="1.6"/>
    <g fill="none" stroke="rgba(120,80,20,0.5)" stroke-width="1.6">
      <path d="M138 58 C136 70 136 82 140 90"/><path d="M162 58 C164 70 164 82 160 90"/>
      <path d="M150 48 L150 92"/>
    </g>
    <g fill="url(#cGold)">
      <rect x="104" y="58" width="8" height="64"/>
      <rect x="196" y="58" width="8" height="64"/>
    </g>
    <ellipse cx="108" cy="72" rx="9" ry="2.6" fill="#d9b25a"/>
    <ellipse cx="200" cy="72" rx="9" ry="2.6" fill="#d9b25a"/>
    <path d="M102 58 L108 44 L114 58 Z" fill="#d9b25a"/>
    <path d="M194 58 L200 44 L206 58 Z" fill="#d9b25a"/>
    <path d="M20 122 q4 -26 2 -40" stroke="#6e4a26" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g stroke="#3f7a3f" stroke-width="3" fill="none" stroke-linecap="round">
      <path d="M22 82 q-12 -8 -18 -2"/><path d="M22 82 q-8 -14 -2 -20"/>
      <path d="M22 82 q6 -14 14 -16"/><path d="M22 82 q12 -6 20 0"/>
    </g>
    <rect x="0" y="122" width="340" height="18" fill="rgba(60,110,190,0.18)"/>
    <g stroke="rgba(140,180,240,0.4)" stroke-width="1.6" stroke-linecap="round">
      <line x1="40" y1="128" x2="76" y2="128"/><line x1="120" y1="132" x2="170" y2="132"/>
      <line x1="220" y1="128" x2="268" y2="128"/>
    </g>
    <g stroke="rgba(232,200,120,0.5)" stroke-width="2" stroke-dasharray="6 5" class="tw">
      <line x1="138" y1="126" x2="162" y2="126"/>
    </g>`);

  /* --- Babylon: Ischtar-Tor mit Zinnen, Rosetten und Stier --- */
  city.babylon = cwrap(`
    <defs>${GOLD}
      <linearGradient id="cbbL" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2c4cab"/><stop offset="1" stop-color="#152a68"/>
      </linearGradient>
    </defs>
    ${tw(48, 34)}${tw(88, 22)}${tw(268, 30)}${tw(310, 50)}
    <rect x="96" y="40" width="44" height="82" fill="url(#cbbL)"/>
    <rect x="200" y="40" width="44" height="82" fill="url(#cbbL)"/>
    <rect x="140" y="64" width="60" height="58" fill="url(#cbbL)"/>
    <g fill="#2c4cab">
      ${[96, 108, 120, 132, 200, 212, 224, 236].map((x) => `<rect x="${x}" y="34" width="8" height="8"/>`).join("")}
      ${[142, 156, 170, 184].map((x) => `<rect x="${x}" y="58" width="8" height="8"/>`).join("")}
    </g>
    <path d="M148 122 L148 96 A22 22 0 0 1 192 96 L192 122 Z" fill="#0b1230"/>
    <path d="M148 96 A22 22 0 0 1 192 96" fill="none" stroke="#d9b25a" stroke-width="2.6"/>
    <g stroke="#d9b25a" stroke-width="2">
      <line x1="96" y1="52" x2="140" y2="52"/><line x1="200" y1="52" x2="244" y2="52"/>
      <line x1="96" y1="112" x2="140" y2="112"/><line x1="200" y1="112" x2="244" y2="112"/>
    </g>
    <g fill="#e8c877">
      ${[102, 118, 134].map((x) => `<circle cx="${x}" cy="60" r="2.4"/>`).join("")}
      ${[206, 222, 238].map((x) => `<circle cx="${x}" cy="60" r="2.4"/>`).join("")}
      ${[102, 118, 134].map((x) => `<circle cx="${x}" cy="106" r="2.4"/>`).join("")}
      ${[206, 222, 238].map((x) => `<circle cx="${x}" cy="106" r="2.4"/>`).join("")}
      ${[150, 166, 182].map((x) => `<circle cx="${x}" cy="74" r="2.2"/>`).join("")}
    </g>
    <g fill="#e8c877">
      <g transform="translate(104 78)">
        <rect x="4" y="6" width="20" height="9" rx="4"/>
        <rect x="5" y="13" width="3" height="9"/><rect x="11" y="13" width="3" height="9"/>
        <rect x="17" y="13" width="3" height="9"/><rect x="22" y="13" width="3" height="9"/>
        <path d="M24 8 q6 -2 6 -8 l2 1 q0 7 -6 10 Z"/>
        <circle cx="27" cy="9" r="3.4"/>
      </g>
      <g transform="translate(208 78)">
        <rect x="4" y="6" width="20" height="9" rx="4"/>
        <rect x="5" y="13" width="3" height="9"/><rect x="11" y="13" width="3" height="9"/>
        <rect x="17" y="13" width="3" height="9"/><rect x="22" y="13" width="3" height="9"/>
        <path d="M24 8 q6 -2 6 -8 l2 1 q0 7 -6 10 Z"/>
        <circle cx="27" cy="9" r="3.4"/>
      </g>
    </g>
    <rect x="0" y="122" width="340" height="18" fill="rgba(190,150,80,0.14)"/>`);

  /* --- Erbil: Zitadellen-Hügel mit Mauerring --- */
  city.erbil = cwrap(`
    <defs>${GOLD}
      <linearGradient id="cerM" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#96703c"/><stop offset="1" stop-color="#5d4423"/>
      </linearGradient>
    </defs>
    ${tw(50, 30)}${tw(110, 20)}${tw(240, 26)}${tw(296, 40)}
    <path d="M18 122 C60 70 280 70 322 122 Z" fill="url(#cerM)"/>
    <g fill="none" stroke="rgba(30,18,6,0.28)" stroke-width="2">
      <path d="M70 108 q100 -26 200 0"/><path d="M100 116 q70 -14 140 0"/>
    </g>
    <rect x="92" y="60" width="156" height="16" fill="#caa45c"/>
    <g fill="#caa45c">
      ${[92, 106, 120, 134, 148, 178, 192, 206, 220, 234].map((x) => `<rect x="${x}" y="54" width="9" height="7"/>`).join("")}
    </g>
    <path d="M158 76 L158 62 A12 10 0 0 1 182 62 L182 76 Z" fill="#3a2a12"/>
    <g fill="#b28c47">
      <rect x="104" y="44" width="18" height="12"/><rect x="130" y="40" width="16" height="16"/>
      <rect x="196" y="42" width="20" height="14"/><rect x="224" y="46" width="14" height="10"/>
    </g>
    <line x1="170" y1="60" x2="170" y2="30" stroke="#e8c877" stroke-width="2"/>
    <path d="M170 30 L190 35 L170 41 Z" fill="url(#cGold)"/>
    <g stroke="#cfd6e8" stroke-width="1.8" fill="none" stroke-linecap="round">
      <path d="M60 40 q4 -4 8 0 q4 -4 8 0"/><path d="M262 34 q4 -4 8 0 q4 -4 8 0"/>
    </g>
    <rect x="0" y="122" width="340" height="18" fill="rgba(190,150,80,0.14)"/>`);

  /* --- Ur: Zikkurat mit großer Freitreppe + Mondscheibe --- */
  city.ur = cwrap(`
    <defs>${GOLD}
      <linearGradient id="curM" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d3a35c"/><stop offset="1" stop-color="#8a6128"/>
      </linearGradient>
    </defs>
    ${tw(48, 36)}${tw(96, 24)}${tw(280, 28)}${tw(316, 52)}
    <circle cx="170" cy="60" r="34" fill="rgba(232,208,140,0.18)"/>
    <circle cx="170" cy="60" r="20" fill="rgba(238,218,160,0.30)"/>
    <rect x="70" y="100" width="200" height="22" fill="url(#curM)"/>
    <rect x="100" y="80" width="140" height="20" fill="url(#curM)"/>
    <rect x="128" y="62" width="84" height="18" fill="url(#curM)"/>
    <g fill="rgba(40,22,4,0.22)">
      <rect x="230" y="100" width="40" height="22"/><rect x="206" y="80" width="34" height="20"/>
      <rect x="186" y="62" width="26" height="18"/>
    </g>
    <g fill="none" stroke="rgba(60,36,10,0.35)" stroke-width="1.4">
      <line x1="70" y1="108" x2="270" y2="108"/><line x1="70" y1="115" x2="270" y2="115"/>
      <line x1="100" y1="87" x2="240" y2="87"/><line x1="100" y1="94" x2="240" y2="94"/>
      <line x1="128" y1="69" x2="212" y2="69"/><line x1="128" y1="75" x2="212" y2="75"/>
    </g>
    <path d="M156 122 L163 62 L177 62 L184 122 Z" fill="#c99a52"/>
    <g stroke="rgba(60,36,10,0.5)" stroke-width="1.3">
      ${[68, 76, 84, 92, 100, 108, 116].map((y) => {
        const w = 14 - (122 - y) * 0.12;
        return `<line x1="${170 - w / 2 - (122 - y) * 0.11}" y1="${y}" x2="${170 + w / 2 + (122 - y) * 0.11}" y2="${y}"/>`;
      }).join("")}
    </g>
    <path d="M70 122 L128 100 L138 100 L84 122 Z" fill="#b9854a"/>
    <path d="M270 122 L212 100 L202 100 L256 122 Z" fill="#b9854a"/>
    <path d="M0 128 q50 -8 90 0 q60 10 120 0 q70 -8 130 2 v10 H0 Z" fill="rgba(190,150,80,0.18)"/>`);

  /* --- Samarra: Malwiya-Spiralminarett --- */
  city.samarra = cwrap(`
    <defs>${GOLD}
      <linearGradient id="csaM" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#d8ab60"/><stop offset="0.5" stop-color="#c1904a"/><stop offset="1" stop-color="#8f6229"/>
      </linearGradient>
    </defs>
    ${tw(60, 30)}${tw(112, 22)}${tw(250, 26)}${tw(300, 46)}
    <circle cx="70" cy="46" r="15" fill="rgba(238,218,160,0.30)"/>
    <rect x="118" y="112" width="104" height="12" fill="url(#csaM)"/>
    ${[
      [128, 100, 84], [133, 88, 74], [138, 77, 64], [143, 66, 54],
      [148, 56, 44], [153, 46, 35], [158, 37, 27]
    ].map(([x, y, w]) => `
      <path d="M${170 - w / 2} ${y + 12} L${170 - w / 2 + 3} ${y} L${170 + w / 2 - 3} ${y} L${170 + w / 2} ${y + 12} Z" fill="url(#csaM)"/>
      <path d="M${170 - w / 2} ${y + 12} L${170 + w / 2} ${y + 10}" stroke="#6b4a1c" stroke-width="2" fill="none"/>`).join("")}
    <rect x="163" y="26" width="14" height="12" fill="url(#csaM)"/>
    <rect x="161" y="23" width="18" height="4" fill="#d9b25a"/>
    <g fill="none" stroke="rgba(40,22,4,0.3)" stroke-width="1.2">
      <line x1="128" y1="118" x2="212" y2="118"/>
    </g>
    <g fill="#b9854a">
      <rect x="34" y="104" width="40" height="18"/><rect x="270" y="108" width="34" height="14"/>
    </g>
    <g fill="#e8c877" opacity="0.85">
      <rect x="42" y="110" width="4" height="4"/><rect x="56" y="110" width="4" height="4" class="tw"/>
      <rect x="278" y="112" width="4" height="4"/>
    </g>
    <path d="M0 128 q60 -8 120 0 q60 8 120 0 q50 -6 100 2 v10 H0 Z" fill="rgba(190,150,80,0.18)"/>`);

  /* --- Mossul: schiefes al-Hadba-Minarett + Brücke über den Tigris --- */
  city.mosul = cwrap(`
    <defs>${GOLD}
      <linearGradient id="cmoB" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#d3a55c"/><stop offset="1" stop-color="#96682f"/>
      </linearGradient>
    </defs>
    ${tw(52, 28)}${tw(104, 20)}${tw(288, 34)}${tw(320, 56)}
    <rect x="0" y="110" width="340" height="30" fill="rgba(70,120,200,0.2)"/>
    <g stroke="rgba(150,190,245,0.4)" stroke-width="1.6" stroke-linecap="round">
      <line x1="30" y1="120" x2="70" y2="120"/><line x1="120" y1="126" x2="180" y2="126"/>
      <line x1="230" y1="120" x2="280" y2="120"/>
    </g>
    <line x1="20" y1="110" x2="320" y2="110" stroke="#caa45c" stroke-width="4"/>
    <g fill="none" stroke="#caa45c" stroke-width="3.4">
      <path d="M40 110 a22 22 0 0 1 44 0"/><path d="M104 110 a22 22 0 0 1 44 0"/>
      <path d="M168 110 a22 22 0 0 1 44 0"/><path d="M232 110 a22 22 0 0 1 44 0"/>
    </g>
    <g transform="rotate(6 226 106)">
      <rect x="218" y="34" width="15" height="72" fill="url(#cmoB)"/>
      <g stroke="rgba(60,36,10,0.5)" stroke-width="1.6">
        <line x1="218" y1="48" x2="233" y2="48"/><line x1="218" y1="60" x2="233" y2="60"/>
        <line x1="218" y1="72" x2="233" y2="72"/><line x1="218" y1="84" x2="233" y2="84"/>
      </g>
      <g fill="none" stroke="rgba(60,36,10,0.45)" stroke-width="1.2">
        <path d="M220 52 l4 4 l4 -4 l4 4"/><path d="M220 64 l4 4 l4 -4 l4 4"/>
      </g>
      <ellipse cx="225.5" cy="34" rx="11" ry="3" fill="#d9b25a"/>
      <path d="M219 30 a7 7 0 0 1 13 0 Z" fill="#d9b25a"/>
    </g>
    <rect x="252" y="86" width="40" height="24" fill="#b9854a"/>
    <path d="M258 86 C258 70 286 70 286 86 Z" fill="url(#cGold)"/>
    <g fill="#e8c877" opacity="0.9">
      <rect x="258" y="92" width="5" height="7"/><rect x="270" y="92" width="5" height="7" class="tw"/>
      <rect x="281" y="92" width="5" height="7"/>
    </g>
    <g stroke="rgba(232,200,120,0.45)" stroke-width="2" stroke-dasharray="5 5">
      <line x1="216" y1="118" x2="238" y2="118" class="tw"/>
    </g>`);

  /* --- Basra: Palmen, Kanal und Balam-Boot --- */
  city.basra = cwrap(`
    <defs>${GOLD}</defs>
    ${tw(70, 26)}${tw(130, 18)}${tw(270, 30)}${tw(316, 48)}
    <circle cx="296" cy="34" r="14" fill="rgba(242,217,140,0.5)"/>
    <g fill="#22397c">
      <rect x="222" y="82" width="30" height="28"/><rect x="258" y="76" width="36" height="34"/>
    </g>
    <g fill="#e8c877" opacity="0.9">
      <rect x="228" y="88" width="5" height="6"/><rect x="238" y="88" width="5" height="6" class="tw"/>
      <rect x="266" y="84" width="5" height="6"/><rect x="278" y="84" width="5" height="6"/>
      <rect x="266" y="96" width="5" height="6" class="tw"/>
    </g>
    <rect x="0" y="110" width="340" height="30" fill="rgba(60,150,190,0.24)"/>
    <g stroke="rgba(160,215,240,0.45)" stroke-width="1.6" stroke-linecap="round">
      <line x1="24" y1="120" x2="66" y2="120"/><line x1="110" y1="128" x2="164" y2="128"/>
      <line x1="210" y1="122" x2="258" y2="122"/><line x1="284" y1="130" x2="322" y2="130"/>
    </g>
    <path d="M118 112 C120 104 128 100 134 100 L204 100 C212 100 222 106 226 96 C228 108 216 114 206 114 L130 114 C124 114 120 114 118 112 Z" fill="#6e4a26"/>
    <line x1="150" y1="100" x2="150" y2="114" stroke="#3a2510" stroke-width="1.6"/>
    <line x1="180" y1="100" x2="180" y2="114" stroke="#3a2510" stroke-width="1.6"/>
    <line x1="196" y1="66" x2="188" y2="112" stroke="#8a6a3a" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="192" cy="92" r="4" fill="#caa45c"/>
    <path d="M192 96 l-2 10 M192 96 l4 9" stroke="#caa45c" stroke-width="2.4" stroke-linecap="round"/>
    ${[[36, 108, -1], [78, 112, 1], [308, 108, -1]].map(([px, py, dir]) => `
      <path d="M${px} ${py} q${6 * dir} -30 ${2 * dir} -44" stroke="#7a5526" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g stroke="#3f8a4a" stroke-width="3" fill="none" stroke-linecap="round">
        <path d="M${px + 2 * dir} ${py - 44} q${-14 * dir} -10 ${-22 * dir} -4"/>
        <path d="M${px + 2 * dir} ${py - 44} q${-8 * dir} -16 ${-2 * dir} -22"/>
        <path d="M${px + 2 * dir} ${py - 44} q${8 * dir} -14 ${16 * dir} -14"/>
        <path d="M${px + 2 * dir} ${py - 44} q${14 * dir} -4 ${20 * dir} 4"/>
      </g>
      <circle cx="${px + 1 * dir}" cy="${py - 42}" r="2.6" fill="#c98a3a"/>`).join("")}`);

  /* --- Nadschaf & Kerbela: goldene Kuppel mit Strahlen --- */
  city.najaf = cwrap(`
    <defs>${GOLD}
      <radialGradient id="cnjD" cx="0.42" cy="0.3" r="0.9">
        <stop offset="0" stop-color="#f8e6b4"/><stop offset="1" stop-color="#bf8c2e"/>
      </radialGradient>
    </defs>
    <circle cx="170" cy="66" r="64" fill="rgba(232,200,120,0.10)"/>
    <circle cx="170" cy="66" r="42" fill="rgba(232,200,120,0.16)"/>
    ${tw(56, 32)}${tw(100, 22)}${tw(244, 24)}${tw(292, 38)}
    <rect x="88" y="100" width="164" height="24" fill="#1e3576"/>
    <g fill="none" stroke="#d9b25a" stroke-width="2">
      <path d="M104 124 v-12 a7 7 0 0 1 14 0 v12"/><path d="M130 124 v-12 a7 7 0 0 1 14 0 v12"/>
      <path d="M196 124 v-12 a7 7 0 0 1 14 0 v12"/><path d="M222 124 v-12 a7 7 0 0 1 14 0 v12"/>
    </g>
    <path d="M152 124 L152 100 A18 16 0 0 1 188 100 L188 124 Z" fill="#0d1738" stroke="#d9b25a" stroke-width="2.4"/>
    <rect x="146" y="94" width="48" height="8" fill="url(#cGold)"/>
    <path d="M170 40 C192 50 196 76 170 94 C144 76 148 50 170 40 Z" fill="url(#cnjD)"/>
    <g fill="none" stroke="rgba(140,95,25,0.5)" stroke-width="1.6">
      <path d="M158 50 C155 64 155 78 160 88"/><path d="M182 50 C185 64 185 78 180 88"/>
      <path d="M170 42 L170 92"/>
    </g>
    <line x1="170" y1="40" x2="170" y2="30" stroke="#e8c877" stroke-width="2"/>
    <circle cx="170" cy="27" r="2.8" fill="none" stroke="#e8c877" stroke-width="1.6"/>
    <g fill="url(#cGold)">
      <rect x="114" y="56" width="9" height="68"/>
      <rect x="217" y="56" width="9" height="68"/>
    </g>
    <ellipse cx="118.5" cy="74" rx="10" ry="2.8" fill="#d9b25a"/>
    <ellipse cx="221.5" cy="74" rx="10" ry="2.8" fill="#d9b25a"/>
    <path d="M112 56 L118.5 42 L125 56 Z" fill="#d9b25a"/>
    <path d="M215 56 L221.5 42 L228 56 Z" fill="#d9b25a"/>
    <rect x="0" y="124" width="340" height="16" fill="rgba(190,150,80,0.14)"/>`);

  /* --- Ahwar-Marschen: Mudhif-Schilfhaus, Schilf, Mashoof-Kanu --- */
  city.marsh = cwrap(`
    <defs>${GOLD}</defs>
    ${tw(60, 26)}${tw(120, 18)}${tw(230, 22)}${tw(300, 40)}
    <rect x="0" y="104" width="340" height="36" fill="rgba(60,140,160,0.26)"/>
    <g stroke="rgba(150,210,225,0.4)" stroke-width="1.6" stroke-linecap="round">
      <line x1="26" y1="116" x2="70" y2="116"/><line x1="120" y1="124" x2="176" y2="124"/>
      <line x1="216" y1="118" x2="262" y2="118"/>
    </g>
    <path d="M64 104 C64 60 156 60 156 104 Z" fill="#c9a45c"/>
    <g fill="none" stroke="#8a6a34" stroke-width="2.4">
      <path d="M72 104 C72 68 148 68 148 104"/>
      <path d="M84 104 C84 74 136 74 136 104"/>
      <path d="M96 104 C96 80 124 80 124 104"/>
    </g>
    <g stroke="rgba(90,64,22,0.4)" stroke-width="1.2">
      <line x1="66" y1="92" x2="154" y2="92"/><line x1="68" y1="80" x2="152" y2="80"/>
      <line x1="74" y1="70" x2="146" y2="70"/>
    </g>
    <path d="M100 104 C100 84 120 84 120 104 Z" fill="#241a08"/>
    ${[[30, 104], [46, 104], [190, 104], [206, 104], [300, 104], [316, 104]].map(([x, y]) => `
      <g stroke="#7aa04a" stroke-width="2.4" fill="none" stroke-linecap="round">
        <path d="M${x} ${y} q-2 -26 -5 -38"/><path d="M${x + 6} ${y} q0 -30 2 -42"/>
        <path d="M${x + 12} ${y} q3 -24 7 -36"/>
      </g>
      <ellipse cx="${x - 5}" cy="${y - 40}" rx="2.2" ry="5" fill="#caa45c"/>
      <ellipse cx="${x + 8}" cy="${y - 44}" rx="2.2" ry="5" fill="#caa45c"/>
      <ellipse cx="${x + 19}" cy="${y - 38}" rx="2.2" ry="5" fill="#caa45c"/>`).join("")}
    <path d="M222 116 C230 108 274 108 284 100 C284 112 272 118 258 118 L236 118 C228 118 224 118 222 116 Z" fill="#5d3f20"/>
    <line x1="268" y1="76" x2="262" y2="114" stroke="#8a6a3a" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="264" cy="98" r="3.6" fill="#caa45c"/>
    <path d="M264 102 l-3 9 M264 102 l4 8" stroke="#caa45c" stroke-width="2.2" stroke-linecap="round"/>
    <g stroke="#cfd6e8" stroke-width="1.8" fill="none" stroke-linecap="round">
      <path d="M96 36 q4 -4 8 0 q4 -4 8 0"/><path d="M130 28 q4 -4 8 0 q4 -4 8 0"/>
      <path d="M250 40 q4 -4 8 0 q4 -4 8 0"/>
    </g>`);

  /* ============================================================
     THEMEN-ICONS (48×48, Goldlinie)
     ============================================================ */
  const icon = {};
  const iw = (inner) => `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="#e8c877" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  /* Kultur */
  icon.maqam = iw(`
    <circle cx="16" cy="34" r="5" fill="#e8c877" stroke="none"/>
    <path d="M21 34 V12 l14 -4 v20"/>
    <circle cx="30" cy="30" r="5" fill="#e8c877" stroke="none"/>
    <path d="M40 18 q4 4 0 9 M43 14 q7 7 0 16" stroke-width="1.8"/>`);
  icon.oud = iw(`
    <path d="M20 28 a10.5 11.5 0 1 0 12 -1 l-4 -5 Z" fill="rgba(232,200,120,0.15)"/>
    <path d="M28 22 L38 8 M34 8 l5 5"/>
    <circle cx="25" cy="32" r="3.2"/>
    <path d="M23 41 q3 -14 11 -22" stroke-width="1.2"/>
    <path d="M20 39 q4 -14 11 -21" stroke-width="1.2"/>`);
  icon.poetry = iw(`
    <path d="M24 12 C20 8 12 8 8 11 V38 c4 -3 12 -3 16 0 c4 -3 12 -3 16 0 V11 c-4 -3 -12 -3 -16 1 Z"/>
    <path d="M24 12 V38"/>
    <path d="M40 6 q-9 4 -12 16 l4 2 q5 -11 8 -18 Z" fill="#e8c877" stroke="none"/>`);
  icon.calligraphy = iw(`
    <path d="M10 38 q14 4 20 -6 q4 -7 -2 -9 q-6 -1 -6 6 q0 8 12 7 q6 -1 8 -6"/>
    <path d="M34 8 l6 6 -14 14 -8 2 2 -8 Z" fill="rgba(232,200,120,0.15)"/>`);
  icon.hospitality = iw(`
    <path d="M16 20 C16 26 20 28 20 32 C20 36 17 38 17.5 42 H30.5 C31 38 28 36 28 32 C28 28 32 26 32 20 Z" fill="rgba(232,200,120,0.12)"/>
    <ellipse cx="24" cy="20" rx="8.6" ry="2.4"/>
    <path d="M20 12 q-2 -3 1 -6 M27 12 q-2 -3 1 -6" stroke-width="1.8"/>`);
  icon.kurdish = iw(`
    <path d="M24 6 C30 14 34 18 34 27 a10 10 0 0 1 -20 0 C14 18 18 14 24 6 Z" fill="rgba(232,200,120,0.12)"/>
    <path d="M24 20 c3 4 5 6 5 10 a5 5 0 0 1 -10 0 c0 -4 2 -6 5 -10 Z" fill="#e8c877" stroke="none"/>`);
  icon.crafts = iw(`
    <path d="M19 10 h10 M20 14 c-6 4 -8 9 -8 14 a12 9 0 0 0 24 0 c0 -5 -2 -10 -8 -14 l1 -4 h-10 Z" fill="rgba(232,200,120,0.1)"/>
    <path d="M12 24 q-5 0 -4 6 q1 4 6 3 M36 24 q5 0 4 6 q-1 4 -6 3" stroke-width="1.8"/>
    <path d="M18 26 h12" stroke-width="1.6"/>`);
  icon.football = iw(`
    <circle cx="24" cy="24" r="16"/>
    <path d="M24 17 l6.5 4.7 -2.5 7.6 h-8 l-2.5 -7.6 Z" fill="#e8c877" stroke="none"/>
    <path d="M24 17 V9 M30.5 21.7 L38 19 M28 29.3 L33 36 M20 29.3 L15 36 M17.5 21.7 L10 19" stroke-width="1.8"/>`);

  /* Feste */
  icon.ramadan = iw(`
    <path d="M28 6 a15 15 0 1 0 12 22 a12.5 12.5 0 0 1 -12 -22 Z" fill="rgba(232,200,120,0.12)"/>
    <circle cx="35" cy="35" r="6"/>
    <path d="M35 29 l2 -3" stroke-width="1.8"/>`);
  icon.eid = iw(`
    <path d="M24 5 v4 M20 9 h8"/>
    <path d="M17 13 h14 l4 14 a11 6 0 0 1 -22 0 Z" fill="rgba(232,200,120,0.12)"/>
    <path d="M24 17 l4 6 -4 6 -4 -6 Z" fill="#e8c877" stroke="none"/>
    <path d="M17 36 l-3 5 M31 36 l3 5 M24 38 v5" stroke-width="1.8"/>`);
  icon.newroz = iw(`
    <path d="M10 40 l12 -5 M38 40 l-12 -5 M14 42 h20"/>
    <path d="M24 8 c5 7 8 10 8 16 a8 8 0 0 1 -16 0 c0 -6 3 -9 8 -16 Z" fill="rgba(232,200,120,0.15)"/>
    <path d="M24 20 c2.5 3.5 4 5 4 8 a4 4 0 0 1 -8 0 c0 -3 1.5 -4.5 4 -8 Z" fill="#e8c877" stroke="none"/>`);
  icon.arbaeen = iw(`
    <circle cx="18" cy="10" r="4"/>
    <path d="M18 14 v12 l-5 14 M18 26 l5 14 M18 17 l-8 5 M18 17 l8 3"/>
    <path d="M33 8 v26" stroke-width="1.8"/>
    <path d="M33 9 h9 v8 h-9" fill="rgba(232,200,120,0.2)"/>`);
  icon.wedding = iw(`
    <circle cx="18" cy="28" r="9"/>
    <circle cx="30" cy="28" r="9"/>
    <path d="M24 8 l4 5 -4 5 -4 -5 Z" fill="#e8c877" stroke="none"/>`);
  icon.tigris = iw(`
    <path d="M24 8 v4 M12 12 l3 3 M36 12 l-3 3"/>
    <path d="M14 26 a10 10 0 0 1 20 0" fill="rgba(232,200,120,0.18)"/>
    <path d="M8 26 h32" stroke-width="1.8"/>
    <path d="M8 33 q4 -3 8 0 q4 3 8 0 q4 -3 8 0 q4 3 8 0 M8 40 q4 -3 8 0 q4 3 8 0 q4 -3 8 0 q4 3 8 0" stroke-width="1.8"/>`);

  /* Reise */
  icon.season = iw(`
    <rect x="8" y="10" width="32" height="30" rx="4"/>
    <path d="M8 19 h32 M16 6 v7 M32 6 v7"/>
    <circle cx="24" cy="30" r="5.5" fill="rgba(232,200,120,0.18)"/>
    <path d="M24 22.5 v-1 M24 38.5 v-1 M31 30 h1 M16 30 h1" stroke-width="1.6"/>`);
  icon.currency = iw(`
    <rect x="6" y="14" width="28" height="18" rx="3"/>
    <circle cx="20" cy="23" r="5"/>
    <path d="M10 18 h2 M28 28 h2" stroke-width="1.8"/>
    <circle cx="35" cy="32" r="7" fill="rgba(232,200,120,0.15)"/>
    <path d="M35 28.5 v7 M32 30.5 h6" stroke-width="1.8"/>`);
  icon.visa = iw(`
    <rect x="10" y="12" width="22" height="30" rx="3"/>
    <circle cx="21" cy="24" r="5"/>
    <path d="M15 34 h12" stroke-width="1.8"/>
    <path d="M32 6 l10 4 -12 8 -3 -2 5 -6 -4 -2 Z" fill="#e8c877" stroke="none"/>`);
  icon.language = iw(`
    <path d="M6 10 h20 v14 h-10 l-6 6 v-6 h-4 Z" fill="rgba(232,200,120,0.1)"/>
    <text x="16" y="21" text-anchor="middle" font-size="11" fill="#e8c877" stroke="none" font-family="inherit">ع</text>
    <path d="M22 28 h20 v12 h-4 v6 l-6 -6 h-10 Z"/>
    <text x="32" y="38" text-anchor="middle" font-size="10" fill="#e8c877" stroke="none" font-family="inherit">A</text>`);
  icon.etiquette = iw(`
    <path d="M6 26 h8 v14 H6 Z"/>
    <path d="M14 38 h16 q6 0 8 -5 l3 -7 q1 -3 -2 -4 q-3 -1 -4 2 l-2 4 h-12" fill="rgba(232,200,120,0.1)"/>
    <path d="M14 28 h10"/>
    <path d="M27 8 c-2.6 0 -4 2 -4 4 c0 3 4 6 4 6 s4 -3 4 -6 c0 -2 -1.4 -4 -4 -4 Z" fill="#e8c877" stroke="none"/>`);
  icon.transport = iw(`
    <path d="M6 30 l10 -2 8 -10 h4 l-5 11 10 -1 3 -5 h4 l-2 8 2 8 h-4 l-3 -5 -10 -1 5 11 h-4 l-8 -10 -10 -2 Z" fill="rgba(232,200,120,0.15)" transform="rotate(-8 24 26)"/>`);

  /* ============================================================
     ZUTATEN (64×64, farbecht — für den 3D-Zutaten-Explorer)
     ============================================================ */
  const ing = {};
  const gw = (inner) => `<svg viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;

  ing.fish = gw(`
    <defs><linearGradient id="gFish" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e8a45a"/><stop offset="1" stop-color="#9a5a24"/></linearGradient></defs>
    <path d="M8 32 C18 18 44 18 52 30 L61 23 L58 33 L61 43 L52 36 C44 46 18 46 8 32 Z" fill="url(#gFish)"/>
    <path d="M26 23 q4 -7 11 -7 q-2 7 -7 9 Z" fill="#b97a35"/>
    <path d="M23 35 a11 11 0 0 0 9 5" stroke="#7c4a1c" stroke-width="2" fill="none"/>
    <g stroke="#7c4a1c" stroke-width="1.4" opacity="0.6" fill="none">
      <path d="M34 26 q3 6 0 12"/><path d="M42 26 q3 6 0 12"/>
    </g>
    <circle cx="17" cy="30" r="2.6" fill="#26150a"/><circle cx="17.9" cy="29.2" r="0.9" fill="#fff"/>`);

  ing.salt = gw(`
    <rect x="24" y="22" width="16" height="28" rx="6" fill="#f4f2ea" stroke="#c9c4b2" stroke-width="1.5"/>
    <path d="M25 22 a7 8 0 0 1 14 0 v2 h-14 Z" fill="#cfd4dc" stroke="#a9afba" stroke-width="1.2"/>
    <circle cx="29" cy="17" r="1.2" fill="#7c828e"/><circle cx="35" cy="17" r="1.2" fill="#7c828e"/>
    <circle cx="32" cy="14" r="1.2" fill="#7c828e"/>
    <rect x="27" y="34" width="10" height="10" rx="2" fill="#e4e0d2"/>
    <circle cx="20" cy="54" r="1.4" fill="#fff"/><circle cx="27" cy="57" r="1.4" fill="#fff"/>
    <circle cx="35" cy="56" r="1.4" fill="#fff"/><circle cx="43" cy="54" r="1.4" fill="#fff"/>`);

  ing.tamarind = gw(`
    <g transform="rotate(-18 30 34)">
      <rect x="10" y="28" width="36" height="13" rx="6.5" fill="#7c4a22"/>
      <g fill="none" stroke="#5d3414" stroke-width="1.6">
        <path d="M21 28 a6 6 0 0 0 0 13"/><path d="M33 28 a6 6 0 0 0 0 13"/>
      </g>
      <ellipse cx="16" cy="31" rx="3.5" ry="2" fill="rgba(220,170,110,0.4)"/>
    </g>
    <g transform="rotate(14 38 46)">
      <rect x="22" y="40" width="30" height="11" rx="5.5" fill="#8a5a2c"/>
      <path d="M32 40 a5 5 0 0 0 0 11 M42 40 a5 5 0 0 0 0 11" fill="none" stroke="#6b4018" stroke-width="1.4"/>
    </g>
    <path d="M48 22 q8 -6 12 -2 q-6 6 -12 2 Z" fill="#5f8f3e"/>`);

  ing.turmeric = gw(`
    <path d="M10 50 q10 -18 22 -18 q12 0 20 18 Z" fill="#e8940f"/>
    <path d="M16 47 q8 -11 16 -11" stroke="#f6b93f" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <g transform="rotate(-24 46 24)">
      <rect x="36" y="19" width="22" height="9" rx="4.5" fill="#c98a3a"/>
      <circle cx="40" cy="23" r="1.6" fill="#a56a22"/><circle cx="48" cy="21" r="1.6" fill="#a56a22"/>
      <circle cx="53" cy="25" r="1.6" fill="#a56a22"/>
      <ellipse cx="58" cy="23" rx="2.4" ry="3" fill="#e8940f"/>
    </g>
    <circle cx="14" cy="28" r="1.3" fill="#f6b93f"/><circle cx="22" cy="24" r="1.3" fill="#f6b93f"/>`);

  ing.lemon = gw(`
    <circle cx="32" cy="34" r="18" fill="#f0cf30"/>
    <circle cx="32" cy="34" r="14.5" fill="#fbf0a0"/>
    <g stroke="#f0cf30" stroke-width="1.8">
      <line x1="32" y1="20" x2="32" y2="48"/><line x1="18" y1="34" x2="46" y2="34"/>
      <line x1="22" y1="24" x2="42" y2="44"/><line x1="42" y1="24" x2="22" y2="44"/>
    </g>
    <circle cx="32" cy="34" r="2.4" fill="#f0cf30"/>
    <circle cx="32" cy="34" r="18" fill="none" stroke="#dcae14" stroke-width="2.4"/>`);

  ing.tomato = gw(`
    <defs><radialGradient id="gTom" cx="0.38" cy="0.32" r="0.85">
      <stop offset="0" stop-color="#ee6a4c"/><stop offset="1" stop-color="#bb3524"/></radialGradient></defs>
    <circle cx="32" cy="36" r="17" fill="url(#gTom)"/>
    <g fill="#3f7a2c">
      <path d="M32 20 l-3 -6 3 2 3 -3 0 4 4 -2 -3 5 Z"/>
      <path d="M24 22 q4 -3 8 -2 q4 -1 8 2 q-4 4 -8 3 q-4 1 -8 -3 Z"/>
    </g>
    <ellipse cx="25" cy="30" rx="4.5" ry="3" fill="rgba(255,255,255,0.4)" transform="rotate(-20 25 30)"/>`);

  ing.onion = gw(`
    <defs><radialGradient id="gOn" cx="0.42" cy="0.35" r="0.9">
      <stop offset="0" stop-color="#eed398"/><stop offset="1" stop-color="#b0812f"/></radialGradient></defs>
    <path d="M32 12 q3 8 9 12 a15 17 0 1 1 -18 0 q6 -4 9 -12 Z" fill="url(#gOn)"/>
    <g fill="none" stroke="rgba(130,90,25,0.55)" stroke-width="1.6">
      <path d="M23 28 q9 -8 18 0"/><path d="M20 36 q12 -10 24 0"/>
    </g>
    <path d="M32 12 q-1 -5 2 -8 M32 12 q3 -4 1 -8" stroke="#8a9a4a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M28 53 l-2 5 M32 54 v5 M36 53 l2 5" stroke="#c9b98a" stroke-width="1.4"/>`);

  ing.fire = gw(`
    <path d="M32 8 c8 10 14 15 14 25 a14 14 0 0 1 -28 0 c0 -10 6 -15 14 -25 Z" fill="#e85d20"/>
    <path d="M32 20 c5 7 9 10 9 16 a9 9 0 0 1 -18 0 c0 -6 4 -9 9 -16 Z" fill="#f6a03a"/>
    <path d="M32 32 c3 4 5 6 5 9 a5 5 0 0 1 -10 0 c0 -3 2 -5 5 -9 Z" fill="#f8d275"/>
    <path d="M14 54 h36" stroke="#8a5a2a" stroke-width="4" stroke-linecap="round"/>
    <path d="M20 58 h24" stroke="#6b4018" stroke-width="4" stroke-linecap="round"/>`);

  ing.vineleaf = gw(`
    <path d="M32 8 C42 14 52 14 54 24 C56 34 46 36 44 44 C42 52 34 54 32 56 C30 54 22 52 20 44 C18 36 8 34 10 24 C12 14 22 14 32 8 Z" fill="#4d7a34"/>
    <g stroke="#8fbf6a" stroke-width="1.7" fill="none">
      <path d="M32 12 V52"/><path d="M32 26 L18 20"/><path d="M32 26 L46 20"/>
      <path d="M32 38 L21 36"/><path d="M32 38 L43 36"/>
    </g>
    <path d="M32 56 q-2 4 -6 5" stroke="#6b4a26" stroke-width="2" fill="none" stroke-linecap="round"/>`);

  ing.rice = gw(`
    <path d="M12 38 a20 12 0 0 0 40 0 Z" fill="#2c4b9e"/>
    <path d="M12 38 a20 5 0 0 0 40 0" fill="#1b2f6b"/>
    <path d="M15 36 q8 -12 17 -12 q9 0 17 12 Z" fill="#f6f1e0"/>
    <g stroke="#d9cfae" stroke-width="1.6" stroke-linecap="round">
      <line x1="24" y1="30" x2="27" y2="28"/><line x1="33" y1="27" x2="36" y2="29"/>
      <line x1="40" y1="32" x2="43" y2="30"/><line x1="20" y1="34" x2="23" y2="32"/>
    </g>
    <ellipse cx="18" cy="20" rx="2.6" ry="1.4" fill="#f6f1e0" transform="rotate(-24 18 20)"/>
    <ellipse cx="46" cy="18" rx="2.6" ry="1.4" fill="#f6f1e0" transform="rotate(24 46 18)"/>`);

  ing.meat = gw(`
    <rect x="8" y="42" width="48" height="8" rx="3" fill="#c9a45c"/>
    <path d="M14 42 q2 -18 18 -18 q18 0 18 18 Z" fill="#b1543a"/>
    <g fill="#8e3c28">
      <circle cx="24" cy="34" r="1.8"/><circle cx="33" cy="30" r="1.8"/><circle cx="42" cy="35" r="1.8"/>
      <circle cx="28" cy="39" r="1.6"/><circle cx="38" cy="39" r="1.6"/>
    </g>
    <ellipse cx="26" cy="29" rx="5" ry="2.4" fill="rgba(240,170,150,0.45)" transform="rotate(-14 26 29)"/>`);

  ing.pepper = gw(`
    <defs><radialGradient id="gPep" cx="0.38" cy="0.3" r="0.9">
      <stop offset="0" stop-color="#ee5b43"/><stop offset="1" stop-color="#b1271b"/></radialGradient></defs>
    <path d="M20 22 C14 26 12 36 14 44 C16 52 24 56 32 56 C40 56 48 52 50 44 C52 36 50 26 44 22 C40 19 24 19 20 22 Z" fill="url(#gPep)"/>
    <g stroke="#8e2418" stroke-width="1.8" fill="none" opacity="0.7">
      <path d="M25 22 q-2 16 0 32"/><path d="M39 22 q2 16 0 32"/>
    </g>
    <path d="M32 20 q-1 -6 3 -9" stroke="#3f7a2c" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="24" cy="30" rx="3.4" ry="6" fill="rgba(255,255,255,0.3)" transform="rotate(-10 24 30)"/>`);

  ing.zucchini = gw(`
    <g transform="rotate(-28 30 34)">
      <rect x="8" y="28" width="42" height="14" rx="7" fill="#3f7a2c"/>
      <g stroke="#6fae4a" stroke-width="2" stroke-linecap="round">
        <line x1="14" y1="32" x2="44" y2="32"/><line x1="14" y1="38" x2="44" y2="38"/>
      </g>
      <path d="M50 31 q6 2 6 4 q0 2 -6 4 Z" fill="#2f5620"/>
    </g>
    <circle cx="47" cy="49" r="8.5" fill="#dfe8b0" stroke="#3f7a2c" stroke-width="2.4"/>
    <g fill="#c3cf8a">
      <circle cx="44" cy="47" r="1.2"/><circle cx="50" cy="47" r="1.2"/>
      <circle cx="47" cy="52" r="1.2"/>
    </g>`);

  ing.pomegranate = gw(`
    <defs><radialGradient id="gPom" cx="0.4" cy="0.32" r="0.9">
      <stop offset="0" stop-color="#d95a44"/><stop offset="1" stop-color="#a2231c"/></radialGradient></defs>
    <circle cx="30" cy="36" r="17" fill="url(#gPom)"/>
    <path d="M25 20 l1 -6 4 4 3 -5 2 6 4 -3 -2 6 Z" fill="#8e2418"/>
    <path d="M30 36 m-10 3 a10 10 0 0 0 18 3 l-4 -12 Z" fill="#f2d3c3"/>
    <g fill="#c0261d">
      <circle cx="27" cy="43" r="2"/><circle cx="33" cy="45" r="2"/><circle cx="38" cy="41" r="2"/>
      <circle cx="30" cy="47" r="1.8"/>
    </g>
    <ellipse cx="24" cy="29" rx="4" ry="2.6" fill="rgba(255,255,255,0.35)" transform="rotate(-18 24 29)"/>`);

  ing.spices = gw(`
    <path d="M6 48 h52" stroke="#8a6a3a" stroke-width="3" stroke-linecap="round"/>
    <path d="M8 46 q7 -13 14 0 Z" fill="#c0392b"/>
    <path d="M24 46 q8 -16 16 0 Z" fill="#e8940f"/>
    <path d="M42 46 q7 -12 14 0 Z" fill="#8a5a2a"/>
    <circle cx="15" cy="32" r="1.2" fill="#c0392b"/><circle cx="32" cy="26" r="1.2" fill="#e8940f"/>
    <circle cx="49" cy="32" r="1.2" fill="#8a5a2a"/>`);

  ing.bulgur = gw(`
    <path d="M10 48 q11 -20 22 -20 q11 0 22 20 Z" fill="#d9b25a"/>
    <g fill="#b98f3a">
      <ellipse cx="24" cy="40" rx="2" ry="1.2"/><ellipse cx="32" cy="36" rx="2" ry="1.2"/>
      <ellipse cx="40" cy="41" rx="2" ry="1.2"/><ellipse cx="28" cy="45" rx="2" ry="1.2"/>
      <ellipse cx="37" cy="46" rx="2" ry="1.2"/>
    </g>
    <ellipse cx="14" cy="26" rx="2.2" ry="1.3" fill="#d9b25a" transform="rotate(-20 14 26)"/>
    <ellipse cx="50" cy="24" rx="2.2" ry="1.3" fill="#d9b25a" transform="rotate(20 50 24)"/>
    <ellipse cx="32" cy="20" rx="2.2" ry="1.3" fill="#d9b25a"/>`);

  ing.pinenuts = gw(`
    ${[[24, 26, -12], [34, 22, 8], [42, 30, 22], [22, 38, -20], [32, 36, 0], [42, 42, 14], [28, 46, -8]]
      .map(([x, y, r]) => `
      <g transform="rotate(${r} ${x} ${y})">
        <path d="M${x} ${y - 6} q4.5 3 4.5 7 a4.5 5 0 0 1 -9 0 q0 -4 4.5 -7 Z" fill="#f2e4bd" stroke="#cbb98a" stroke-width="1"/>
      </g>`).join("")}`);

  ing.raisins = gw(`
    <path d="M32 12 q1 6 0 10" stroke="#6b4a26" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    ${[[26, 28], [38, 28], [22, 38], [32, 36], [42, 38], [28, 47], [38, 47]].map(([x, y]) => `
      <ellipse cx="${x}" cy="${y}" rx="5.5" ry="6.5" fill="#4a2438"/>
      <ellipse cx="${x - 1.6}" cy="${y - 2}" rx="1.6" ry="2" fill="rgba(190,140,180,0.35)"/>`).join("")}`);

  ing.lamb = gw(`
    <defs><linearGradient id="gLam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b06f34"/><stop offset="1" stop-color="#6b3a14"/></linearGradient></defs>
    <path d="M14 44 C10 30 24 18 36 22 C48 26 52 40 46 48 C38 56 20 56 14 44 Z" fill="url(#gLam)"/>
    <g transform="rotate(-36 48 22)">
      <rect x="40" y="18" width="18" height="7" rx="3.5" fill="#efe6cf"/>
      <circle cx="58" cy="18" r="4.4" fill="#f7f0dd"/><circle cx="58" cy="26" r="4.4" fill="#f7f0dd"/>
    </g>
    <path d="M20 34 q8 -8 18 -6" stroke="rgba(255,220,180,0.4)" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);

  ing.saffron = gw(`
    <path d="M18 50 q14 -8 28 0 q-14 6 -28 0 Z" fill="#a2231c" opacity="0.6"/>
    <g stroke="#c0261d" stroke-width="2.2" fill="none" stroke-linecap="round">
      <path d="M22 46 C18 36 24 24 20 14"/>
      <path d="M32 48 C30 36 36 26 32 12"/>
      <path d="M42 46 C46 36 40 24 44 14"/>
    </g>
    <g stroke="#e8611f" stroke-width="1.8" fill="none" stroke-linecap="round">
      <path d="M27 46 C25 38 29 28 26 20"/>
      <path d="M38 47 C40 38 36 28 39 18"/>
    </g>`);

  ing.almond = gw(`
    <g transform="rotate(-18 24 32)">
      <path d="M24 14 q11 8 11 19 a11 12 0 0 1 -22 0 q0 -11 11 -19 Z" fill="#b97a3f"/>
      <path d="M24 20 q7 6 7 13" stroke="#8e5a28" stroke-width="1.6" fill="none"/>
    </g>
    <g transform="rotate(16 44 40)">
      <path d="M44 24 q10 7 10 17 a10 11 0 0 1 -20 0 q0 -10 10 -17 Z" fill="#f2e4bd" stroke="#cbb98a" stroke-width="1.4"/>
      <path d="M40 36 q4 -4 8 -2" stroke="#cbb98a" stroke-width="1.4" fill="none"/>
    </g>`);

  ing.cardamom = gw(`
    ${[[22, 26, -24], [36, 22, 6], [42, 40, 30]].map(([x, y, r]) => `
      <g transform="rotate(${r} ${x} ${y})">
        <ellipse cx="${x}" cy="${y}" rx="6" ry="11" fill="#8fae59"/>
        <path d="M${x} ${y - 11} V${y + 11}" stroke="#5f7a34" stroke-width="1.6"/>
        <path d="M${x} ${y - 11} q3 0 4 3 M${x} ${y + 11} q-3 0 -4 -3" stroke="#5f7a34" stroke-width="1.2" fill="none"/>
      </g>`).join("")}
    <g fill="#3a2a12">
      <circle cx="22" cy="50" r="1.7"/><circle cx="28" cy="53" r="1.7"/><circle cx="34" cy="50" r="1.7"/>
    </g>`);

  ing.chicken = gw(`
    <defs><radialGradient id="gChk" cx="0.4" cy="0.32" r="0.9">
      <stop offset="0" stop-color="#d99a55"/><stop offset="1" stop-color="#a5661f"/></radialGradient></defs>
    <path d="M16 26 C10 36 14 48 26 50 C40 52 50 42 46 30 C42 20 24 16 16 26 Z" fill="url(#gChk)"/>
    <g transform="rotate(32 50 44)">
      <rect x="42" y="42" width="16" height="6" rx="3" fill="#efe6cf"/>
      <circle cx="58" cy="42" r="3.8" fill="#f7f0dd"/><circle cx="58" cy="49" r="3.8" fill="#f7f0dd"/>
    </g>
    <path d="M20 28 q6 -6 14 -4" stroke="rgba(255,235,200,0.5)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);

  ing.noodles = gw(`
    <g stroke="#d9b25a" stroke-width="2.6" fill="none" stroke-linecap="round">
      <path d="M12 40 q10 -18 40 -8"/>
      <path d="M10 34 q16 -14 44 -2"/>
      <path d="M14 46 q14 -10 38 -4"/>
      <path d="M18 50 q12 -6 30 -2"/>
    </g>
    <g stroke="#b98f3a" stroke-width="2.2" fill="none" stroke-linecap="round">
      <path d="M16 28 q14 -10 34 -4"/><path d="M20 22 q12 -6 26 -2"/>
    </g>`);

  ing.peas = gw(`
    <path d="M14 24 C24 20 44 22 52 34 C42 44 22 42 14 30 Z" fill="#3f8a3f"/>
    <path d="M14 24 q-4 4 0 6" stroke="#2f6b2c" stroke-width="2" fill="none"/>
    <g fill="#6fbf4f" stroke="#3f8a3f" stroke-width="1.2">
      <circle cx="24" cy="31" r="5"/><circle cx="34" cy="32" r="5"/><circle cx="43" cy="33" r="5"/>
    </g>
    <circle cx="22" cy="48" r="4.4" fill="#6fbf4f" stroke="#3f8a3f" stroke-width="1.2"/>
    <circle cx="34" cy="51" r="4.4" fill="#6fbf4f" stroke="#3f8a3f" stroke-width="1.2"/>
    <ellipse cx="23" cy="29" rx="1.6" ry="1" fill="rgba(255,255,255,0.5)"/>`);

  ing.potato = gw(`
    <ellipse cx="28" cy="30" rx="17" ry="13" fill="#b98a52" transform="rotate(-12 28 30)"/>
    <g fill="#8e6a3a">
      <ellipse cx="20" cy="27" rx="1.6" ry="1.1"/><ellipse cx="30" cy="24" rx="1.6" ry="1.1"/>
      <ellipse cx="36" cy="32" rx="1.6" ry="1.1"/><ellipse cx="24" cy="35" rx="1.6" ry="1.1"/>
    </g>
    <g fill="#eec547" stroke="#c99a25" stroke-width="1.2">
      <rect x="38" y="42" width="11" height="11" rx="2" transform="rotate(10 43 47)"/>
      <rect x="20" y="46" width="10" height="10" rx="2" transform="rotate(-8 25 51)"/>
    </g>`);

  ing.bread = gw(`
    <ellipse cx="32" cy="34" rx="22" ry="14" fill="#d9a44e"/>
    <ellipse cx="32" cy="32" rx="22" ry="13" fill="#e5b862"/>
    <g fill="#b1783a">
      <circle cx="24" cy="28" r="1.8"/><circle cx="34" cy="26" r="1.8"/><circle cx="42" cy="31" r="1.8"/>
      <circle cx="28" cy="36" r="1.6"/><circle cx="38" cy="37" r="1.6"/>
    </g>
    <path d="M46 44 l10 6 -4 -10 Z" fill="#f2e4c0" stroke="#d9a44e" stroke-width="1.4"/>`);

  ing.chickpeas = gw(`
    ${[[24, 26], [38, 24], [20, 40], [32, 38], [44, 38], [28, 50]].map(([x, y]) => `
      <circle cx="${x}" cy="${y}" r="6.5" fill="#e8d3a3" stroke="#c3a267" stroke-width="1.2"/>
      <path d="M${x - 2} ${y - 6} q2 -2 4 0" stroke="#c3a267" stroke-width="1.4" fill="none"/>
      <circle cx="${x - 2}" cy="${y - 2}" r="1.3" fill="rgba(255,255,255,0.5)"/>`).join("")}`);

  ing.garlic = gw(`
    <path d="M32 14 q2 6 7 9 a14 15 0 1 1 -14 0 q5 -3 7 -9 Z" fill="#f2ecdd" stroke="#d3c9b0" stroke-width="1.4"/>
    <g stroke="#d3c9b0" stroke-width="1.4" fill="none">
      <path d="M26 26 q-3 10 0 20"/><path d="M38 26 q3 10 0 20"/><path d="M32 24 V48"/>
    </g>
    <g stroke="rgba(160,120,160,0.4)" stroke-width="1.2" fill="none">
      <path d="M22 32 q-2 6 0 12"/><path d="M42 32 q2 6 0 12"/>
    </g>
    <path d="M32 14 q0 -4 3 -7" stroke="#b0a582" stroke-width="2" fill="none" stroke-linecap="round"/>`);

  ing.loomi = gw(`
    <circle cx="26" cy="32" r="13" fill="#6b4423"/>
    <g stroke="#4a2c12" stroke-width="1.3" fill="none" opacity="0.8">
      <path d="M17 27 q9 -4 18 0"/><path d="M15 34 q11 4 22 0"/><path d="M20 41 q6 3 12 0"/>
    </g>
    <circle cx="26" cy="21" r="1.8" fill="#3a2210"/>
    <circle cx="45" cy="43" r="10" fill="#8a5c30"/>
    <g stroke="#6b4018" stroke-width="1.2" fill="none" opacity="0.8">
      <path d="M38 40 q7 -3 14 0"/><path d="M38 46 q7 3 14 0"/>
    </g>
    <circle cx="45" cy="34.5" r="1.4" fill="#4a2c12"/>`);

  ing.flour = gw(`
    <path d="M18 22 h28 l3 30 h-34 Z" fill="#e8dcc0" stroke="#c9bb98" stroke-width="1.5"/>
    <path d="M18 22 q14 6 28 0 l-2 -6 q-12 4 -24 0 Z" fill="#d3c5a2"/>
    <g stroke="#b0996b" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M32 32 v12"/>
      <path d="M32 36 l-4 -4 M32 36 l4 -4 M32 41 l-4 -4 M32 41 l4 -4"/>
    </g>
    <path d="M8 54 q8 -7 16 0 Z" fill="#f6f1e0"/>
    <circle cx="12" cy="44" r="1.3" fill="#f6f1e0"/><circle cx="20" cy="42" r="1.3" fill="#f6f1e0"/>`);

  ing.yeast = gw(`
    <g fill="#d9c496" stroke="#b39a66" stroke-width="1.3">
      <rect x="14" y="34" width="14" height="14" rx="2.5"/>
      <rect x="32" y="38" width="12" height="12" rx="2.5"/>
      <rect x="26" y="22" width="12" height="12" rx="2.5"/>
    </g>
    <g fill="none" stroke="#cfd6e0" stroke-width="1.8">
      <circle cx="48" cy="24" r="3.4"/><circle cx="54" cy="15" r="2.6"/><circle cx="44" cy="12" r="2"/>
    </g>`);

  ing.water = gw(`
    <defs><linearGradient id="gWat" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fd0ee"/><stop offset="1" stop-color="#2a7ab8"/></linearGradient></defs>
    <path d="M32 8 C42 22 48 30 48 40 a16 16 0 0 1 -32 0 C16 30 22 22 32 8 Z" fill="url(#gWat)"/>
    <path d="M24 38 a8 10 0 0 0 4 10" stroke="rgba(255,255,255,0.65)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="12" cy="22" r="2.6" fill="#8fd0ee"/><circle cx="52" cy="18" r="2" fill="#8fd0ee"/>`);

  ing.tannour = gw(`
    <path d="M12 52 C12 26 52 26 52 52 Z" fill="#b97a3f"/>
    <path d="M16 52 C16 32 48 32 48 52 Z" fill="#a5661f" opacity="0.5"/>
    <path d="M24 52 C24 40 40 40 40 52 Z" fill="#26150a"/>
    <path d="M32 44 c2.5 3 4 4.5 4 7 a4 4 0 0 1 -8 0 c0 -2.5 1.5 -4 4 -7 Z" fill="#f6a03a"/>
    <path d="M8 52 h48" stroke="#6b4018" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M44 26 q4 -5 2 -10" stroke="rgba(220,220,220,0.5)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);

  ing.sesame = gw(`
    <path d="M14 44 a18 9 0 0 0 36 0 Z" fill="#8a5c30"/>
    <ellipse cx="32" cy="44" rx="18" ry="5" fill="#a5764a"/>
    ${[[24, 42, -20], [32, 41, 10], [40, 43, -8], [28, 45, 24], [36, 45, -16]].map(([x, y, r]) => `
      <ellipse cx="${x}" cy="${y}" rx="2" ry="3.2" fill="#f6f1e0" transform="rotate(${r} ${x} ${y})"/>`).join("")}
    ${[[20, 22, 14], [30, 16, -10], [42, 20, 20], [36, 28, -18], [25, 30, 8]].map(([x, y, r]) => `
      <ellipse cx="${x}" cy="${y}" rx="2" ry="3.2" fill="#f2e4bd" transform="rotate(${r} ${x} ${y})"/>`).join("")}`);

  ing.pastry = gw(`
    <g fill="#eec572" stroke="#c99a3f" stroke-width="1.3">
      <path d="M10 44 q11 -5 22 0 q11 5 22 0 v6 q-11 5 -22 0 q-11 -5 -22 0 Z"/>
      <path d="M10 34 q11 -5 22 0 q11 5 22 0 v6 q-11 5 -22 0 q-11 -5 -22 0 Z"/>
      <path d="M10 24 q11 -5 22 0 q11 5 22 0 v6 q-11 5 -22 0 q-11 -5 -22 0 Z"/>
    </g>
    <path d="M14 22 q9 -4 18 0" stroke="rgba(255,246,220,0.8)" stroke-width="1.8" fill="none" stroke-linecap="round"/>`);

  ing.ghee = gw(`
    <ellipse cx="32" cy="48" rx="22" ry="7" fill="#e2dac2" stroke="#c9a24d" stroke-width="1.2"/>
    <g>
      <rect x="18" y="26" width="28" height="18" rx="3" fill="#f2cd5e"/>
      <path d="M18 29 a14 4 0 0 1 28 0" fill="#f8e08a"/>
      <path d="M46 36 q5 3 4 9 q-4 1 -6 -3" fill="#f2cd5e"/>
    </g>
    <ellipse cx="26" cy="30" rx="5" ry="1.8" fill="rgba(255,255,255,0.55)"/>`);

  ing.syrup = gw(`
    <path d="M22 18 h20 v6 q6 4 6 12 v14 a6 6 0 0 1 -6 6 h-20 a6 6 0 0 1 -6 -6 v-14 q0 -8 6 -12 Z"
          fill="rgba(190,220,240,0.25)" stroke="rgba(200,220,240,0.6)" stroke-width="1.5"/>
    <path d="M17 38 q0 -6 5 -10 h20 q5 4 5 10 v12 a5 5 0 0 1 -5 5 h-20 a5 5 0 0 1 -5 -5 Z" fill="#c9821e"/>
    <rect x="20" y="12" width="24" height="7" rx="2.5" fill="#8a5a2a"/>
    <path d="M32 26 q6 8 0 16" stroke="rgba(255,220,150,0.6)" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);

  ing.geymar = gw(`
    <ellipse cx="32" cy="46" rx="24" ry="8" fill="#f0e9d5" stroke="#c9a24d" stroke-width="1.3"/>
    <path d="M14 44 c-3 -12 10 -18 19 -11 c4 -9 21 -7 21 3 c8 -1 12 7 6 11 c-14 6 -35 6 -46 -3 Z" fill="#fbf7ea"/>
    <path d="M20 42 q16 7 36 1" stroke="#e3d7ba" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M24 32 q6 -4 12 -1" stroke="rgba(255,255,255,0.9)" stroke-width="2" fill="none" stroke-linecap="round"/>`);

  ing.dates = gw(`
    <defs><linearGradient id="gDat" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8a4f22"/><stop offset="1" stop-color="#5a2f12"/></linearGradient></defs>
    ${[[22, 30, -22], [36, 24, 6], [42, 42, 28]].map(([x, y, r]) => `
      <g transform="rotate(${r} ${x} ${y})">
        <ellipse cx="${x}" cy="${y}" rx="7.5" ry="12" fill="url(#gDat)"/>
        <path d="M${x - 3} ${y - 8} q3 -2 6 0" stroke="rgba(230,180,120,0.5)" stroke-width="1.6" fill="none"/>
        <ellipse cx="${x - 2.4}" cy="${y - 3}" rx="1.6" ry="4" fill="rgba(230,180,120,0.3)"/>
      </g>`).join("")}
    <ellipse cx="20" cy="50" rx="6" ry="3.4" fill="#5a2f12"/>
    <ellipse cx="20" cy="49" rx="2.4" ry="1.2" fill="#c9a45c"/>`);

  ing.walnut = gw(`
    <circle cx="26" cy="30" r="15" fill="#a5764a"/>
    <path d="M26 16 V44 M15 22 q6 8 0 16 M37 22 q-6 8 0 16" stroke="#7c5228" stroke-width="2" fill="none"/>
    <path d="M44 38 c6 0 10 4 10 8 c0 4 -4 7 -8 7 c-2 0 -3 -1 -4 -2 c-1 1 -2 2 -4 2 c-4 0 -8 -3 -8 -7 c0 -4 4 -8 10 -8 Z" fill="#d9b280"/>
    <path d="M44 40 v11 M38 43 q3 3 6 3 M50 43 q-3 3 -6 3" stroke="#b08a52" stroke-width="1.6" fill="none"/>`);

  ing.coconut = gw(`
    <circle cx="30" cy="34" r="18" fill="#6b4423"/>
    <circle cx="30" cy="34" r="14.5" fill="#f6f1e0"/>
    <circle cx="30" cy="34" r="6" fill="#e2d6b8"/>
    <circle cx="30" cy="34" r="18" fill="none" stroke="#4a2c12" stroke-width="2"/>
    <g stroke="#8a5c30" stroke-width="1.2" opacity="0.7">
      <path d="M16 24 q4 -3 8 -2" fill="none"/><path d="M40 20 q4 1 6 4" fill="none"/>
    </g>
    <g fill="#f6f1e0">
      <ellipse cx="50" cy="46" rx="2.6" ry="1.2" transform="rotate(-16 50 46)"/>
      <ellipse cx="54" cy="40" rx="2.6" ry="1.2" transform="rotate(12 54 40)"/>
      <ellipse cx="48" cy="53" rx="2.6" ry="1.2" transform="rotate(8 48 53)"/>
    </g>`);

  ing.rosewater = gw(`
    <path d="M26 20 h8 v6 q7 5 7 14 v8 a7 7 0 0 1 -7 7 h-8 a7 7 0 0 1 -7 -7 v-8 q0 -9 7 -14 Z"
          fill="rgba(230,170,190,0.3)" stroke="rgba(220,190,210,0.7)" stroke-width="1.5"/>
    <path d="M21 42 q0 -8 6 -12 h6 q6 4 6 12 v6 a5 5 0 0 1 -5 5 h-8 a5 5 0 0 1 -5 -5 Z" fill="#e58aa8"/>
    <rect x="26" y="13" width="8" height="8" rx="2" fill="#b0806b"/>
    <g transform="translate(46 24)">
      <circle r="7" fill="#d3547a"/>
      <path d="M0 -4 a4 4 0 0 1 4 4 a4 4 0 0 1 -4 4 a4 4 0 0 1 -4 -4 a2.5 2.5 0 0 1 4 -2" fill="none" stroke="#f2b8ca" stroke-width="1.5"/>
      <path d="M-6 8 q6 4 12 0" stroke="#3f7a2c" stroke-width="2" fill="none"/>
    </g>`);

  ing.tea = gw(`
    ${[[22, 24, -30], [36, 18, 10], [42, 34, 40]].map(([x, y, r]) => `
      <g transform="rotate(${r} ${x} ${y})">
        <path d="M${x} ${y - 10} q7 5 7 10 q0 7 -7 10 q-7 -3 -7 -10 q0 -5 7 -10 Z" fill="#2f5620"/>
        <path d="M${x} ${y - 8} V${y + 8}" stroke="#5f8f3e" stroke-width="1.4"/>
      </g>`).join("")}
    <path d="M14 52 q18 -8 36 0 q-18 6 -36 0 Z" fill="#26150a"/>
    <circle cx="24" cy="49" r="1.2" fill="#4a2c12"/><circle cx="34" cy="51" r="1.2" fill="#4a2c12"/>
    <circle cx="42" cy="49" r="1.2" fill="#4a2c12"/>`);

  ing.sugar = gw(`
    <g fill="#fbfaf3" stroke="#d9d2ba" stroke-width="1.4">
      <rect x="16" y="32" width="15" height="13" rx="2"/>
      <rect x="34" y="34" width="14" height="12" rx="2"/>
      <rect x="25" y="19" width="14" height="12" rx="2"/>
    </g>
    <g stroke="#e8e2cc" stroke-width="1.2">
      <line x1="16" y1="37" x2="31" y2="37"/><line x1="34" y1="39" x2="48" y2="39"/>
      <line x1="25" y1="24" x2="39" y2="24"/>
    </g>
    <path d="M50 18 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6 Z" fill="#fff"/>
    <circle cx="20" cy="52" r="1.3" fill="#fff"/><circle cx="30" cy="54" r="1.3" fill="#fff"/>
    <circle cx="40" cy="52" r="1.3" fill="#fff"/>`);

  return { dish: dish, city: city, icon: icon, ing: ing };
})();
