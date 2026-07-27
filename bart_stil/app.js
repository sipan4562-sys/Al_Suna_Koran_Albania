/* ============================================================
   BART_STIL — Oberfläche
   ============================================================ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------------------------------------------- Theme */
  const THEME_KEY = 'bartstil:theme';
  const setTheme = (t) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  };
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) setTheme(saved);
    else if (window.matchMedia('(prefers-color-scheme: light)').matches) setTheme('light');
  } catch (e) {}
  $('#themeBtn').addEventListener('click', () =>
    setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light')
  );

  /* ---------------------------------------------------- Favoriten */
  const FAV_KEY = 'bartstil:favs';
  let favs = new Set();
  try { favs = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch (e) {}
  const saveFavs = () => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch (e) {}
  };

  /* ---------------------------------------------------- Kennzahlen */
  $('#stCount').textContent = STYLES.length;
  $('#stSteps').textContent = STYLES.reduce((n, s) => n + s.steps.length, 0) + PHOTO_STEPS.length;
  $('#year').textContent = '© ' + new Date().getFullYear() + ' Bart_stil';

  /* ---------------------------------------------------- Hero-Kacheln */
  $('#heroArt').innerHTML = ['vollbart', 'handlebar', 'goatee', 'ducktail']
    .map((id) => {
      const s = STYLES.find((x) => x.id === id);
      return `<div class="tile">${BeardArt.render(s.art, { label: s.name })}</div>`;
    })
    .join('');

  /* ====================================================
     1:1-Tutorial am Foto
     ==================================================== */
  const GUIDE_COLORS = {
    axis: '#5cc8ff',
    cheek: '#ffb454',
    neck: '#7ee081',
    zones: '#ff8fa3',
    fade: '#c89bff',
  };
  const GUIDE_LABELS = {
    axis: 'Symmetrieachse',
    cheek: 'Wangenlinie',
    neck: 'Halslinie',
    zones: 'Längenzonen',
    fade: 'Übergangszone',
  };

  function guideMarkup() {
    const t = (x, y, txt, col, anchor) =>
      `<text x="${x}" y="${y}" fill="${col}" font-size="26" font-weight="700" ` +
      `font-family="system-ui, sans-serif" text-anchor="${anchor || 'start'}" ` +
      `style="paint-order:stroke;stroke:rgba(0,0,0,.72);stroke-width:6px">${txt}</text>`;

    return `
    <g data-guide="axis" opacity="0">
      <path d="M385,180 L385,1010" stroke="${GUIDE_COLORS.axis}" stroke-width="3"
            stroke-dasharray="14 12" opacity=".95"/>
      <circle cx="385" cy="985" r="8" fill="${GUIDE_COLORS.axis}"/>
      <circle cx="385" cy="700" r="8" fill="${GUIDE_COLORS.axis}"/>
      ${t(400, 235, 'Mittelachse', GUIDE_COLORS.axis)}
    </g>

    <g data-guide="cheek" opacity="0">
      <path d="M116,455 Q158,650 290,795" fill="none" stroke="${GUIDE_COLORS.cheek}"
            stroke-width="6" stroke-linecap="round"/>
      <path d="M663,455 Q627,650 470,795" fill="none" stroke="${GUIDE_COLORS.cheek}"
            stroke-width="6" stroke-linecap="round"/>
      <circle cx="116" cy="455" r="9" fill="${GUIDE_COLORS.cheek}"/>
      <circle cx="663" cy="455" r="9" fill="${GUIDE_COLORS.cheek}"/>
      <circle cx="290" cy="795" r="9" fill="${GUIDE_COLORS.cheek}"/>
      <circle cx="470" cy="795" r="9" fill="${GUIDE_COLORS.cheek}"/>
      ${t(26, 425, 'Ohrläppchen', GUIDE_COLORS.cheek)}
      ${t(495, 872, 'Mundwinkel', GUIDE_COLORS.cheek)}
    </g>

    <g data-guide="neck" opacity="0">
      <path d="M160,905 Q385,1120 620,905" fill="none" stroke="${GUIDE_COLORS.neck}"
            stroke-width="6" stroke-linecap="round" stroke-dasharray="20 14"/>
      <path d="M385,995 L385,1092" stroke="${GUIDE_COLORS.neck}" stroke-width="4"/>
      <path d="M345,1016 L425,1016 M345,1058 L425,1058" stroke="${GUIDE_COLORS.neck}" stroke-width="4"/>
      ${t(440, 1050, 'zwei Finger', GUIDE_COLORS.neck)}
      ${t(26, 1165, 'Halslinie – nicht am Kiefer ansetzen', GUIDE_COLORS.neck)}
    </g>

    <g data-guide="zones" opacity="0">
      <path d="M135,470 Q180,655 295,795" fill="none" stroke="${GUIDE_COLORS.zones}"
            stroke-width="80" stroke-linecap="round" opacity=".2"/>
      <path d="M648,470 Q612,655 468,795" fill="none" stroke="${GUIDE_COLORS.zones}"
            stroke-width="80" stroke-linecap="round" opacity=".2"/>
      <path d="M215,845 Q385,1000 550,845" fill="none" stroke="${GUIDE_COLORS.zones}"
            stroke-width="90" stroke-linecap="round" opacity=".28"/>
      ${t(26, 640, 'Wangen 3 mm', GUIDE_COLORS.zones)}
      ${t(216, 960, 'Kinn / Kiefer 4 mm', GUIDE_COLORS.zones)}
    </g>

    <g data-guide="fade" opacity="0">
      <path d="M116,455 Q158,650 290,795" fill="none" stroke="${GUIDE_COLORS.fade}"
            stroke-width="30" stroke-linecap="round" opacity=".38"/>
      <path d="M663,455 Q627,650 470,795" fill="none" stroke="${GUIDE_COLORS.fade}"
            stroke-width="30" stroke-linecap="round" opacity=".38"/>
      <path d="M160,905 Q385,1120 620,905" fill="none" stroke="${GUIDE_COLORS.fade}"
            stroke-width="30" stroke-linecap="round" opacity=".38"/>
      ${t(26, 370, 'weich auslaufen lassen', GUIDE_COLORS.fade)}
    </g>`;
  }

  const guides = $('#guides');
  guides.innerHTML = guideMarkup();

  const activeGuides = new Set();
  function applyGuides() {
    $$('[data-guide]', guides).forEach((g) => {
      g.setAttribute('opacity', activeGuides.has(g.dataset.guide) ? '1' : '0');
      g.style.transition = 'opacity .25s ease';
    });
    $$('#guideLegend .chip').forEach((c) =>
      c.setAttribute('aria-pressed', activeGuides.has(c.dataset.g) ? 'true' : 'false')
    );
  }

  $('#guideLegend').innerHTML = Object.keys(GUIDE_LABELS)
    .map(
      (k) =>
        `<button class="chip" data-g="${k}" aria-pressed="false">` +
        `<i style="background:${GUIDE_COLORS[k]}"></i>${GUIDE_LABELS[k]}</button>`
    )
    .join('');
  $('#guideLegend').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    activeGuides.has(b.dataset.g) ? activeGuides.delete(b.dataset.g) : activeGuides.add(b.dataset.g);
    applyGuides();
  });

  $('#photoSteps').innerHTML = PHOTO_STEPS.map(
    (s, i) =>
      `<article class="step" data-i="${i}" data-guide="${s.guide}" tabindex="0" role="button">
         <h3><small>${esc(s.n)}</small> ${esc(s.t)}</h3>
         <p>${esc(s.d)}</p>
       </article>`
  ).join('');

  function activateStep(el) {
    $$('#photoSteps .step').forEach((s) => s.classList.toggle('active', s === el));
    activeGuides.clear();
    if (el.dataset.guide && el.dataset.guide !== 'none') activeGuides.add(el.dataset.guide);
    applyGuides();
  }
  $('#photoSteps').addEventListener('click', (e) => {
    const s = e.target.closest('.step');
    if (s) activateStep(s);
  });
  $('#photoSteps').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const s = e.target.closest('.step');
    if (s) { e.preventDefault(); activateStep(s); }
  });
  activateStep($('#photoSteps .step[data-i="2"]'));

  /* ====================================================
     Stil-Raster
     ==================================================== */
  const catRow = $('#catRow');
  let curCat = '';
  catRow.innerHTML =
    `<button class="chip on" data-c="">Alle (${STYLES.length})</button>` +
    Object.entries(CATS)
      .map(
        ([k, v]) =>
          `<button class="chip" data-c="${k}">${v} (${STYLES.filter((s) => s.cat === k).length})</button>`
      )
      .join('');
  catRow.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    curCat = b.dataset.c;
    $$('.chip', catRow).forEach((c) => c.classList.toggle('on', c === b));
    draw();
  });

  $('#fFace').insertAdjacentHTML(
    'beforeend',
    Object.entries(FACES).map(([k, v]) => `<option value="${k}">${v}es Gesicht</option>`).join('')
  );

  let onlyFav = false;
  $('#fFav').addEventListener('click', (e) => {
    onlyFav = !onlyFav;
    e.currentTarget.setAttribute('aria-pressed', String(onlyFav));
    draw();
  });
  $('#q').addEventListener('input', draw);
  $('#fFace').addEventListener('change', draw);
  $('#fLevel').addEventListener('change', draw);

  function matches(s) {
    if (curCat && s.cat !== curCat) return false;
    if (onlyFav && !favs.has(s.id)) return false;
    const f = $('#fFace').value;
    if (f && !s.faces.includes(f)) return false;
    const lv = $('#fLevel').value;
    if (lv !== '' && String(s.level) !== lv) return false;
    const q = $('#q').value.trim().toLowerCase();
    if (q) {
      const hay = (s.name + ' ' + s.en + ' ' + s.short + ' ' + s.desc).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function card(s) {
    return `
      <button class="card" data-id="${s.id}" aria-label="${esc(s.name)} – Tutorial öffnen">
        <span class="fav ${favs.has(s.id) ? 'on' : ''}" data-fav="${s.id}" role="button"
              title="Merken" aria-label="${esc(s.name)} merken">${favs.has(s.id) ? '★' : '☆'}</span>
        <div class="card-art">${BeardArt.render(s.art, { label: s.name })}</div>
        <div class="card-body">
          <h3>${esc(s.name)}</h3>
          <div class="en">${esc(s.en)}</div>
          <p>${esc(s.short)}</p>
          <div class="meta">
            <span class="tag lv${s.level}">${LEVELS[s.level]}</span>
            <span class="tag">${esc(s.growth)}</span>
            <span class="tag">Pflege ${UPKEEP[s.upkeep - 1] || UPKEEP[0]}</span>
          </div>
        </div>
      </button>`;
  }

  function draw() {
    const list = STYLES.filter(matches);
    $('#grid').innerHTML = list.length
      ? list.map(card).join('')
      : `<div class="empty"><b>Kein Stil gefunden.</b><br />Setze die Filter zurück oder such etwas allgemeiner.</div>`;
  }

  $('#grid').addEventListener('click', (e) => {
    const f = e.target.closest('[data-fav]');
    if (f) {
      e.stopPropagation();
      const id = f.dataset.fav;
      favs.has(id) ? favs.delete(id) : favs.add(id);
      saveFavs();
      draw();
      return;
    }
    const c = e.target.closest('.card');
    if (c) openSheet(c.dataset.id);
  });

  /* ====================================================
     Detail-Dialog
     ==================================================== */
  const sheet = $('#sheet');
  function openSheet(id) {
    const s = STYLES.find((x) => x.id === id);
    if (!s) return;
    $('#sheetIn').innerHTML = `
      <div class="sheet-head">
        <button class="close-x" data-close aria-label="Schließen">✕</button>
        <div class="art">${BeardArt.render(s.art, { label: s.name })}</div>
        <div>
          <span class="kicker">${CATS[s.cat]}</span>
          <h2>${esc(s.name)}</h2>
          <div class="en">${esc(s.en)}</div>
          <p>${esc(s.desc)}</p>
          <div class="meta" style="margin-top:.9rem">
            <span class="tag lv${s.level}">${LEVELS[s.level]}</span>
            ${s.faces.map((f) => `<span class="tag">${FACES[f]}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="sheet-body">
        <div class="facts">
          <div class="fact"><span>Wuchsdauer</span><b>${esc(s.growth)}</b></div>
          <div class="fact"><span>Zeitaufwand</span><b>${esc(s.time)}</b></div>
          <div class="fact"><span>Pflegeaufwand</span><b>${UPKEEP[s.upkeep - 1] || UPKEEP[0]}</b></div>
          <div class="fact"><span>Schritte</span><b>${s.steps.length}</b></div>
        </div>

        <div>
          <h4 class="blockhead">Schritt für Schritt</h4>
          <ol class="tut-steps">
            ${s.steps.map(([t, d]) => `<li><div><b>${esc(t)}</b><span>${esc(d)}</span></div></li>`).join('')}
          </ol>
        </div>

        <div class="two-col">
          <div>
            <h4 class="blockhead">Einstellungen</h4>
            <table class="settings">
              ${s.settings.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
            </table>
          </div>
          <div>
            <h4 class="blockhead">Werkzeug</h4>
            <ul class="plain">${s.tools.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          </div>
        </div>

        <div class="two-col">
          <div>
            <h4 class="blockhead">Tipps</h4>
            <ul class="plain">${s.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          </div>
          <div>
            <h4 class="blockhead">Typische Fehler</h4>
            <ul class="plain warn">${s.fails.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          </div>
        </div>

        <div style="display:flex;gap:.6rem;flex-wrap:wrap">
          <button class="btn btn-primary" data-fav2="${s.id}">
            ${favs.has(s.id) ? '★ Gemerkt' : '☆ Merken'}
          </button>
          <button class="btn btn-ghost" data-close>Schließen</button>
        </div>
      </div>`;
    if (typeof sheet.showModal === 'function') sheet.showModal();
    else sheet.setAttribute('open', '');
    sheet.scrollTop = 0;
  }

  sheet.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === sheet) {
      sheet.close ? sheet.close() : sheet.removeAttribute('open');
      return;
    }
    const f = e.target.closest('[data-fav2]');
    if (f) {
      const id = f.dataset.fav2;
      favs.has(id) ? favs.delete(id) : favs.add(id);
      saveFavs();
      f.textContent = favs.has(id) ? '★ Gemerkt' : '☆ Merken';
      draw();
    }
  });

  /* ====================================================
     Gesichtsform-Finder
     ==================================================== */
  const FACE_SHAPES = {
    oval: 'M30,6 C44,6 52,21 52,38 C52,57 43,69 30,69 C17,69 8,57 8,38 C8,21 16,6 30,6 Z',
    rund: 'M30,12 C44,12 55,23 55,37 C55,51 44,62 30,62 C16,62 5,51 5,37 C5,23 16,12 30,12 Z',
    eckig: 'M8,10 L52,10 L52,54 Q52,68 38,68 L22,68 Q8,68 8,54 Z',
    herz: 'M6,14 Q30,2 54,14 C54,36 46,56 30,70 C14,56 6,36 6,14 Z',
    laenglich: 'M30,2 C41,2 47,17 47,38 C47,60 40,72 30,72 C20,72 13,60 13,38 C13,17 19,2 30,2 Z',
    dreieck: 'M18,8 L42,8 C50,26 55,46 55,54 Q55,68 30,70 Q5,68 5,54 C5,46 10,26 18,8 Z',
  };
  $('#faceBtns').innerHTML = Object.entries(FACES)
    .map(
      ([k, v]) => `
      <button class="face-btn" data-f="${k}">
        <svg viewBox="0 0 60 74" aria-hidden="true">
          <path d="${FACE_SHAPES[k]}" fill="none" stroke="currentColor" stroke-width="3.4"
                stroke-linejoin="round"/>
        </svg>
        <span>${v}</span>
      </button>`
    )
    .join('');

  $('#faceBtns').addEventListener('click', (e) => {
    const b = e.target.closest('.face-btn');
    if (!b) return;
    $$('.face-btn').forEach((x) => x.classList.toggle('on', x === b));
    const k = b.dataset.f;
    const a = FACE_ADVICE[k];
    const rec = STYLES.filter((s) => s.id !== 'glatt' && s.faces.includes(k)).slice(0, 8);
    $('#faceOut').innerHTML = `
      <h3>${esc(a.title)}</h3>
      <p style="color:var(--muted);margin:0">${esc(a.text)}</p>
      <div class="rec">
        ${rec.map((s) => `<button data-open="${s.id}">${esc(s.name)}</button>`).join('')}
      </div>`;
  });
  $('#faceOut').addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (b) openSheet(b.dataset.open);
  });

  /* ---------------------------------------------------- Nach oben */
  const toTop = $('#toTop');
  addEventListener('scroll', () => toTop.classList.toggle('show', scrollY > 700), { passive: true });
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  draw();
})();
