/* ============================================================
   BART_STIL — SVG-Zeichner
   Baut aus einem "art"-Rezept eine vollständige Illustration.
   Alle Farben laufen über CSS-Variablen, damit Hell/Dunkel
   automatisch mitgeht.
   ============================================================ */

const BeardArt = (() => {
  let uid = 0;

  /* ---- Grundgeometrie (viewBox 0 0 200 260) ---- */
  const HEAD =
    'M100,20 C136,20 153,46 154,86 C155,116 149,152 130,178 ' +
    'C119,193 110,201 100,201 C90,201 81,193 70,178 ' +
    'C51,152 45,116 46,86 C47,46 64,20 100,20 Z';

  const HAIR =
    'M46,88 C44,42 66,16 100,16 C134,16 156,42 154,88 ' +
    'C150,58 130,42 100,42 C70,42 50,58 46,88 Z';

  const NECK =
    'M82,178 L82,212 C70,221 58,227 44,233 L44,260 L156,260 L156,233 ' +
    'C142,227 130,221 118,212 L118,178 Z';

  /* Kinnformen */
  const CHIN = {
    goatee:
      'M80,150 Q100,142 120,150 C126,170 120,196 100,203 C80,196 74,170 80,150 Z',
    circle:
      'M72,132 Q100,127 128,132 C134,166 122,199 100,205 C78,199 66,166 72,132 Z',
    pointed:
      'M84,150 Q100,144 116,150 C120,172 112,200 100,218 C88,200 80,172 84,150 Z',
    strip: 'M90,148 L110,148 L112,194 Q100,204 88,194 Z',
    patch: 'M91,165 Q100,161 109,165 L111,182 Q100,188 89,182 Z',
    balbo:
      'M70,150 Q100,141 130,150 C134,176 120,202 100,207 C80,202 66,176 70,150 Z',
    anchor:
      'M76,164 Q100,156 124,164 C126,184 114,204 100,212 C86,204 74,184 76,164 Z',
  };

  const CHIN_EXTRA = {
    balbo: [
      'M58,118 Q68,116 74,124 L80,152 Q70,156 64,148 Z',
      'M142,118 Q132,116 126,124 L120,152 Q130,156 136,148 Z',
    ],
    anchor: [
      'M80,170 Q68,156 60,136 L71,131 Q79,153 89,166 Z',
      'M120,170 Q132,156 140,136 L129,131 Q121,153 111,166 Z',
      CHIN.patch,
    ],
  };

  /* Schnurrbärte */
  const MUS = {
    chevron:
      'M75,138 Q100,131 125,138 Q130,150 123,161 Q111,154 100,155 Q89,154 77,161 Q70,150 75,138 Z',
    natural:
      'M79,141 Q100,135 121,141 Q125,151 119,159 Q110,154 100,154 Q90,154 81,159 Q75,151 79,141 Z',
    walrus:
      'M68,134 Q100,124 132,134 Q140,154 130,178 Q115,164 100,164 Q85,164 70,178 Q60,154 68,134 Z',
    handlebar:
      'M79,138 Q100,132 121,138 Q125,150 118,159 Q109,153 100,153 Q91,153 82,159 Q75,150 79,138 Z',
    horseshoe:
      'M74,136 Q100,129 126,136 Q131,149 124,160 Q111,153 100,154 Q89,153 76,160 Q69,149 74,136 Z',
    english:
      'M85,141 Q100,136 115,141 Q117,149 113,156 Q107,151 100,151 Q93,151 87,156 Q83,149 85,141 Z',
    dali:
      'M87,143 Q100,139 113,143 Q115,149 112,155 Q106,151 100,151 Q94,151 88,155 Q85,149 87,143 Z',
    pencil: 'M79,147 Q100,141 121,147 L121,152 Q100,147 79,152 Z',
    imperial:
      'M83,139 Q100,133 117,139 Q121,149 115,158 Q108,152 100,152 Q92,152 85,158 Q79,149 83,139 Z',
  };

  /* Zusatzstriche (gezwirbelte / ausgezogene Enden) */
  const MUS_STROKE = {
    handlebar: [
      ['M81,144 C68,143 58,137 56,127 C55,120 61,115 66,119', 5.5],
      ['M119,144 C132,143 142,137 144,127 C145,120 139,115 134,119', 5.5],
    ],
    english: [
      ['M88,149 C77,151 68,150 59,145', 6],
      ['M112,149 C123,151 132,150 141,145', 6],
    ],
    dali: [
      ['M89,148 C76,147 66,139 63,125 C61,117 67,111 72,114', 3.2],
      ['M111,148 C124,147 134,139 137,125 C139,117 133,111 128,114', 3.2],
    ],
    horseshoe: [
      ['M78,150 L82,197', 12],
      ['M122,150 L118,197', 12],
    ],
  };

  const HANG = (len, shape) => {
    const b = 201 + len;
    switch (shape) {
      case 'point':
        return `M66,176 Q100,171 134,176 Q139,${b - 16} 100,${b + 10} Q61,${b - 16} 66,176 Z`;
      case 'square':
        return `M64,176 Q100,171 136,176 L133,${b - 2} Q100,${b + 4} 67,${b - 2} Z`;
      case 'wide':
        return `M58,174 Q100,169 142,174 Q152,${b - 10} 100,${b + 4} Q48,${b - 10} 58,174 Z`;
      default:
        return `M62,176 Q100,171 138,176 Q147,${b - 10} 100,${b + 4} Q53,${b - 10} 62,176 Z`;
    }
  };

  const SIDEBURN = {
    short: ['M40,86 L65,86 L61,114 L40,114 Z', 'M160,86 L135,86 L139,114 L160,114 Z'],
    mid: ['M40,86 L67,86 L61,136 L40,136 Z', 'M160,86 L133,86 L139,136 L160,136 Z'],
    long: ['M40,84 L69,84 L60,156 L40,156 Z', 'M160,84 L131,84 L140,156 L160,156 Z'],
  };

  /* Mutton Chops: breite Wangenflächen, Kinn und Oberlippe bleiben frei */
  const CHOPS = [
    'M32,95 L63,95 Q82,126 78,156 Q58,174 30,164 Z',
    'M168,95 L137,95 Q118,126 122,156 Q142,174 170,164 Z',
  ];

  const massPath = (m) => {
    const top = m.top,
      dip = m.dip === undefined ? 20 : m.dip,
      x0 = m.x0 === undefined ? 30 : m.x0,
      x1 = m.x1 === undefined ? 170 : m.x1;
    return `M${x0},${top} Q100,${top + 2 * dip} ${x1},${top} L${x1},252 L${x0},252 Z`;
  };

  /* ------------------------------------------------------------------
     Haupt-Renderer
     ------------------------------------------------------------------ */
  function render(art, opts) {
    art = art || {};
    opts = opts || {};
    const id = ++uid;
    const clip = `fc${id}`;
    const fade = `fd${id}`;
    const pat = `pt${id}`;

    const tex = art.texture || 'solid';
    const hairFill =
      tex === 'stubble' ? `url(#${pat})` : 'var(--hair)';
    const op = tex === 'short' ? 0.92 : 1;

    const parts = [];

    /* --- defs --- */
    let defs =
      `<clipPath id="${clip}"><path d="${HEAD}"/></clipPath>` +
      `<pattern id="${pat}" width="4" height="4" patternUnits="userSpaceOnUse">` +
      `<rect width="4" height="4" fill="var(--hair)" opacity=".44"/>` +
      `<circle cx="1" cy="1" r=".9" fill="var(--hair)" opacity=".5"/>` +
      `<circle cx="3" cy="3" r=".9" fill="var(--hair)" opacity=".5"/>` +
      `<circle cx="3" cy="1" r=".5" fill="var(--hair)" opacity=".35"/>` +
      `<circle cx="1" cy="3" r=".5" fill="var(--hair)" opacity=".35"/>` +
      `</pattern>`;
    if (art.fade && art.mass) {
      const t = art.mass.top;
      defs +=
        `<linearGradient id="${fade}" x1="0" y1="${t - 10}" x2="0" y2="${t + 44}" gradientUnits="userSpaceOnUse">` +
        `<stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>` +
        `<mask id="m${fade}"><rect x="0" y="0" width="200" height="260" fill="url(#${fade})"/></mask>`;
    }
    parts.push(`<defs>${defs}</defs>`);

    /* --- Hals, Schultern, Kopf --- */
    parts.push(`<path d="${NECK}" fill="var(--skin-shade)"/>`);
    parts.push(`<path d="${HEAD}" fill="var(--skin)"/>`);
    parts.push(
      `<ellipse cx="45" cy="108" rx="6.5" ry="12.5" fill="var(--skin)"/>` +
        `<ellipse cx="155" cy="108" rx="6.5" ry="12.5" fill="var(--skin)"/>`
    );
    if (art.hair !== 'none')
      parts.push(`<path d="${HAIR}" fill="var(--hair)" opacity=".92"/>`);

    /* --- Bartmasse (auf das Gesicht beschnitten) --- */
    const inner = [];
    if (art.mass) {
      const mp = `<path d="${massPath(art.mass)}" fill="${hairFill}" opacity="${op}"/>`;
      inner.push(art.fade ? `<g mask="url(#m${fade})">${mp}</g>` : mp);
    }
    if (art.sideburn && SIDEBURN[art.sideburn]) {
      SIDEBURN[art.sideburn].forEach((d) =>
        inner.push(`<path d="${d}" fill="${hairFill}" opacity="${op}"/>`)
      );
    }
    if (art.chops) {
      CHOPS.forEach((d) =>
        inner.push(`<path d="${d}" fill="${hairFill}" opacity="${op}"/>`)
      );
    }
    if (art.chin && CHIN[art.chin]) {
      inner.push(`<path d="${CHIN[art.chin]}" fill="${hairFill}" opacity="${op}"/>`);
      (CHIN_EXTRA[art.chin] || []).forEach((d) =>
        inner.push(`<path d="${d}" fill="${hairFill}" opacity="${op}"/>`)
      );
    }
    /* Aussparungen (Kinnriemen, Chops, rasierte Oberlippe …) */
    (art.holes || []).forEach((h) => {
      if (h.d) inner.push(`<path d="${h.d}" fill="var(--skin)"/>`);
      else {
        const s = h.scale || 0.85,
          oy = h.oy === undefined ? 150 : h.oy;
        inner.push(
          `<path d="${HEAD}" fill="var(--skin)" transform="translate(100,${oy}) scale(${s}) translate(-100,${-oy})"/>`
        );
      }
    });
    parts.push(`<g clip-path="url(#${clip})">${inner.join('')}</g>`);

    /* --- hängende Länge (darf über das Gesicht hinausragen) --- */
    if (art.hang)
      parts.push(
        `<path d="${HANG(art.hang.len, art.hang.shape)}" fill="${hairFill}" opacity="${op}"/>`
      );

    /* --- Nase --- */
    parts.push(
      `<path d="M96,112 C94,127 89,133 95,137 Q100,140 105,137 C111,133 106,127 104,112" ` +
        `fill="none" stroke="var(--skin-line)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
    );

    /* --- Mund --- */
    parts.push(
      `<path d="M82,157 Q91,150 100,154 Q109,150 118,157 Q109,171 100,171 Q91,171 82,157 Z" fill="var(--lips)"/>` +
        `<path d="M82,157 Q100,162 118,157" fill="none" stroke="var(--lips-line)" stroke-width="1.6" stroke-linecap="round"/>`
    );

    /* --- Schnurrbart --- */
    const m = art.mustache;
    if (m && m !== 'none') {
      if (MUS[m])
        parts.push(`<path d="${MUS[m]}" fill="${hairFill}" opacity="${op}"/>`);
      (MUS_STROKE[m] || []).forEach(([d, w]) =>
        parts.push(
          `<path d="${d}" fill="none" stroke="${
            tex === 'stubble' ? 'var(--hair)' : hairFill
          }" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`
        )
      );
    }

    /* --- Augen & Brauen --- */
    parts.push(
      `<path d="M66,86 Q79,79 93,86" fill="none" stroke="var(--hair)" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M134,86 Q121,79 107,86" fill="none" stroke="var(--hair)" stroke-width="5" stroke-linecap="round"/>` +
        `<ellipse cx="79" cy="99" rx="8.5" ry="4.8" fill="var(--eye-white)"/>` +
        `<ellipse cx="121" cy="99" rx="8.5" ry="4.8" fill="var(--eye-white)"/>` +
        `<circle cx="79" cy="99" r="3.3" fill="var(--eye)"/>` +
        `<circle cx="121" cy="99" r="3.3" fill="var(--eye)"/>`
    );

    const cls = opts.cls ? ` class="${opts.cls}"` : '';
    return (
      `<svg${cls} viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" ` +
      `role="img" aria-label="${opts.label || 'Bartstil-Illustration'}">${parts.join('')}</svg>`
    );
  }

  return { render };
})();
