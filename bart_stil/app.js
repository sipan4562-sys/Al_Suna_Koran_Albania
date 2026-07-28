/* ============================================================
   BART_STIL — Oberfläche (dreisprachig, DE / EN / AR)
   ============================================================ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  /* Zahlenbereiche wie „6–8" kippen in RTL-Absätzen um.
     Deshalb im Arabischen jeden Bereich in LTR-Isolate einfassen. */
  const bidi = (s) =>
    cur === 'ar'
      ? String(s).replace(/(\d[\d.,]*\s*[\u2013-]\s*\d[\d.,]*)/g, '\u2066$1\u2069')
      : String(s);
  const esc = (s) =>
    bidi(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------------------------------------------- Sprache */
  const LANGS2 = ['de', 'en', 'ar'];
  const LANGS = LANGS2;
  const LANG_KEY = 'bartstil:lang';
  let cur = 'de';
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && LANGS.includes(saved)) cur = saved;
    else {
      const nav = (navigator.language || 'de').slice(0, 2).toLowerCase();
      if (LANGS.includes(nav)) cur = nav;
    }
  } catch (e) {}

  let L = LANG[cur];
  let STYLES = [];

  const path = (obj, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  function buildStyles() {
    STYLES = STYLE_BASE.map((b) => Object.assign({}, b, L.styles[b.id]));
  }

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

  /* ====================================================
     Hilfslinien auf dem animierten Gesicht
     Koordinaten im Bühnensystem (340 × 300):
     Gesicht liegt bei translate(70, 18)
     ==================================================== */
  const G_COLORS = {
    axis: '#5cc8ff', cheek: '#ffb454', neck: '#7ee081',
    zones: '#ff8fa3', fade: '#c89bff',
  };

  function guideMarkup() {
    const m = L.tut.marks;
    const t = (x, y, txt, col, anchor) =>
      `<text x="${x}" y="${y}" fill="${col}" font-size="8.5" font-weight="700" ` +
      `text-anchor="${anchor || 'start'}" ` +
      `style="paint-order:stroke;stroke:rgba(0,0,0,.55);stroke-width:2.6px">${esc(txt)}</text>`;

    return `
    <g data-guide="axis" opacity="0">
      <path d="M170,40 L170,250" stroke="${G_COLORS.axis}" stroke-width="1.6" stroke-dasharray="6 5"/>
      <circle cx="170" cy="130" r="3" fill="${G_COLORS.axis}"/>
      <circle cx="170" cy="219" r="3" fill="${G_COLORS.axis}"/>
    </g>

    <g data-guide="cheek" opacity="0">
      <path d="M120,133 Q128,157 152,176" fill="none" stroke="${G_COLORS.cheek}"
            stroke-width="2.6" stroke-linecap="round"/>
      <path d="M220,133 Q212,157 188,176" fill="none" stroke="${G_COLORS.cheek}"
            stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="120" cy="133" r="3.6" fill="${G_COLORS.cheek}"/>
      <circle cx="220" cy="133" r="3.6" fill="${G_COLORS.cheek}"/>
      <circle cx="152" cy="176" r="3.6" fill="${G_COLORS.cheek}"/>
      <circle cx="188" cy="176" r="3.6" fill="${G_COLORS.cheek}"/>
      <path d="M62,124 L115,132" stroke="${G_COLORS.cheek}" stroke-width="1.2" opacity=".8"/>
      <path d="M278,190 L192,178" stroke="${G_COLORS.cheek}" stroke-width="1.2" opacity=".8"/>
      ${t(4, 121, m.ear, G_COLORS.cheek)}
      ${t(336, 191, m.mouth, G_COLORS.cheek, 'end')}
    </g>

    <g data-guide="neck" opacity="0">
      <path d="M146,216 Q170,246 194,216" fill="none" stroke="${G_COLORS.neck}"
            stroke-width="2.6" stroke-linecap="round" stroke-dasharray="7 5"/>
      <path d="M170,221 L170,244" stroke="${G_COLORS.neck}" stroke-width="1.6"/>
      <path d="M160,227 L180,227 M160,238 L180,238" stroke="${G_COLORS.neck}" stroke-width="1.6"/>
      <path d="M262,246 L184,240" stroke="${G_COLORS.neck}" stroke-width="1.2" opacity=".8"/>
      ${t(336, 250, m.fingers, G_COLORS.neck, 'end')}
      ${t(170, 288, m.neckHint, G_COLORS.neck, 'middle')}
    </g>

    <g data-guide="zones" opacity="0">
      <path d="M126,140 Q132,158 154,178" fill="none" stroke="${G_COLORS.zones}"
            stroke-width="26" stroke-linecap="round" opacity=".22"/>
      <path d="M214,140 Q208,158 186,178" fill="none" stroke="${G_COLORS.zones}"
            stroke-width="26" stroke-linecap="round" opacity=".22"/>
      <path d="M144,192 Q170,216 196,192" fill="none" stroke="${G_COLORS.zones}"
            stroke-width="30" stroke-linecap="round" opacity=".3"/>
      ${t(4, 152, m.cheeks, G_COLORS.zones)}
      ${t(336, 226, m.chin, G_COLORS.zones, 'end')}
    </g>

    <g data-guide="fade" opacity="0">
      <path d="M120,133 Q128,157 152,176" fill="none" stroke="${G_COLORS.fade}"
            stroke-width="13" stroke-linecap="round" opacity=".4"/>
      <path d="M220,133 Q212,157 188,176" fill="none" stroke="${G_COLORS.fade}"
            stroke-width="13" stroke-linecap="round" opacity=".4"/>
      <path d="M146,216 Q170,246 194,216" fill="none" stroke="${G_COLORS.fade}"
            stroke-width="13" stroke-linecap="round" opacity=".4"/>
      ${t(170, 288, m.soft, G_COLORS.fade, 'middle')}
    </g>`;
  }

  const activeGuides = new Set();
  let activeStep = 2;

  function applyGuides() {
    $$('#guides [data-guide]').forEach((g) =>
      g.setAttribute('opacity', activeGuides.has(g.dataset.guide) ? '1' : '0')
    );
    $$('#guideLegend .chip').forEach((c) =>
      c.setAttribute('aria-pressed', activeGuides.has(c.dataset.g) ? 'true' : 'false')
    );
  }

  function activateStep(i) {
    activeStep = i;
    const steps = $$('#photoSteps .step');
    steps.forEach((s) => s.classList.toggle('active', +s.dataset.i === i));
    activeGuides.clear();
    const g = L.photoSteps[i] && L.photoSteps[i].guide;
    if (g && g !== 'none') activeGuides.add(g);
    applyGuides();
  }

  function renderTutorial() {
    $('#faceStage').insertAdjacentHTML(
      'afterbegin',
      BeardArt.renderTutorial(TUTORIAL_ART, L.tut.h2)
    );
    $('#guides').innerHTML = guideMarkup();

    $('#guideLegend').innerHTML = Object.keys(L.tut.legend)
      .map(
        (k) =>
          `<button class="chip" data-g="${k}" aria-pressed="false">` +
          `<i style="background:${G_COLORS[k]}"></i>${esc(L.tut.legend[k])}</button>`
      )
      .join('');

    $('#photoSteps').innerHTML = L.photoSteps
      .map(
        (s, i) =>
          `<article class="step" data-i="${i}" tabindex="0" role="button">
             <h3><small>${esc(s.n)}</small> ${esc(s.t)}</h3>
             <p>${esc(s.d)}</p>
           </article>`
      )
      .join('');

    activateStep(Math.min(activeStep, L.photoSteps.length - 1));
  }

  $('#guideLegend').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    activeGuides.has(b.dataset.g) ? activeGuides.delete(b.dataset.g) : activeGuides.add(b.dataset.g);
    applyGuides();
  });
  $('#photoSteps').addEventListener('click', (e) => {
    const s = e.target.closest('.step');
    if (s) activateStep(+s.dataset.i);
  });
  $('#photoSteps').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const s = e.target.closest('.step');
    if (s) { e.preventDefault(); activateStep(+s.dataset.i); }
  });

  /* ====================================================
     Stil-Raster
     ==================================================== */
  let curCat = '';
  let onlyFav = false;

  function renderCatRow() {
    $('#catRow').innerHTML =
      `<button class="chip${curCat === '' ? ' on' : ''}" data-c="">${esc(L.list.all)} (${STYLES.length})</button>` +
      CAT_KEYS.map(
        (k) =>
          `<button class="chip${curCat === k ? ' on' : ''}" data-c="${k}">` +
          `${esc(L.cats[k])} (${STYLES.filter((s) => s.cat === k).length})</button>`
      ).join('');
  }
  $('#catRow').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    curCat = b.dataset.c;
    $$('#catRow .chip').forEach((c) => c.classList.toggle('on', c === b));
    draw();
  });

  function renderFilters() {
    const face = $('#fFace').value;
    const lvl = $('#fLevel').value;
    $('#fFace').innerHTML =
      `<option value="">${esc(L.list.allFaces)}</option>` +
      FACE_KEYS.map((k) => `<option value="${k}">${esc(L.facesLong[k])}</option>`).join('');
    $('#fLevel').innerHTML =
      `<option value="">${esc(L.list.anyLevel)}</option>` +
      L.levels.map((v, i) => `<option value="${i}">${esc(v)}</option>`).join('');
    $('#fFace').value = face;
    $('#fLevel').value = lvl;
    $('#fFace').setAttribute('aria-label', L.list.allFaces);
    $('#fLevel').setAttribute('aria-label', L.list.anyLevel);
    $('#q').placeholder = L.list.search;
    $('#q').setAttribute('aria-label', L.list.searchLabel);
    $('#fFav').textContent = L.list.favs;
  }

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
      const hay = (s.name + ' ' + s.alt + ' ' + s.short + ' ' + s.desc).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function card(s) {
    return `
      <button class="card" data-id="${s.id}" aria-label="${esc(s.name)} – ${esc(L.list.open)}">
        <span class="fav ${favs.has(s.id) ? 'on' : ''}" data-fav="${s.id}" role="button"
              aria-label="${esc(s.name)} – ${esc(L.list.remember)}">${favs.has(s.id) ? '★' : '☆'}</span>
        <div class="card-art">${BeardArt.render(s.art, { label: s.name })}</div>
        <div class="card-body">
          <h3>${esc(s.name)}</h3>
          <div class="en" dir="auto">${esc(s.alt)}</div>
          <p>${esc(s.short)}</p>
          <div class="meta">
            <span class="tag lv${s.level}">${esc(L.levels[s.level])}</span>
            <span class="tag">${esc(s.growth)}</span>
            <span class="tag">${esc(L.list.care)}: ${esc(L.upkeep[s.upkeep - 1])}</span>
          </div>
        </div>
      </button>`;
  }

  function draw() {
    const list = STYLES.filter(matches);
    $('#grid').innerHTML = list.length
      ? list.map(card).join('')
      : `<div class="empty"><b>${esc(L.list.empty)}</b><br />${esc(L.list.emptyHint)}</div>`;
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
  let openId = null;

  function openSheet(id) {
    const s = STYLES.find((x) => x.id === id);
    if (!s) return;
    openId = id;
    $('#sheetIn').innerHTML = `
      <div class="sheet-head">
        <button class="close-x" data-close aria-label="${esc(L.sheet.close)}">✕</button>
        <div class="art">${BeardArt.render(s.art, { label: s.name })}</div>
        <div>
          <span class="kicker">${esc(L.cats[s.cat])}</span>
          <h2>${esc(s.name)}</h2>
          <div class="en" dir="auto">${esc(s.alt)}</div>
          <p>${esc(s.desc)}</p>
          <div class="meta" style="margin-top:.9rem">
            <span class="tag lv${s.level}">${esc(L.levels[s.level])}</span>
            ${s.faces.map((f) => `<span class="tag">${esc(L.faces[f])}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="sheet-body">
        <div class="facts">
          <div class="fact"><span>${esc(L.sheet.growth)}</span><b>${esc(s.growth)}</b></div>
          <div class="fact"><span>${esc(L.sheet.time)}</span><b>${esc(s.time)}</b></div>
          <div class="fact"><span>${esc(L.sheet.upkeepLabel)}</span><b>${esc(L.upkeep[s.upkeep - 1])}</b></div>
          <div class="fact"><span>${esc(L.sheet.stepsLabel)}</span><b>${s.steps.length}</b></div>
        </div>

        <div>
          <h4 class="blockhead">${esc(L.sheet.stepByStep)}</h4>
          <ol class="tut-steps">
            ${s.steps.map(([t, d]) => `<li><div><b>${esc(t)}</b><span>${esc(d)}</span></div></li>`).join('')}
          </ol>
        </div>

        <div class="two-col">
          <div>
            <h4 class="blockhead">${esc(L.sheet.settings)}</h4>
            <table class="settings">
              ${s.settings.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
            </table>
          </div>
          <div>
            <h4 class="blockhead">${esc(L.sheet.tools)}</h4>
            <ul class="plain">${s.tools.map((t) => `<li>${esc(L.tools[t])}</li>`).join('')}</ul>
          </div>
        </div>

        <div class="two-col">
          <div>
            <h4 class="blockhead">${esc(L.sheet.tips)}</h4>
            <ul class="plain">${s.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          </div>
          <div>
            <h4 class="blockhead">${esc(L.sheet.fails)}</h4>
            <ul class="plain warn">${s.fails.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          </div>
        </div>

        <div style="display:flex;gap:.6rem;flex-wrap:wrap">
          <button class="btn btn-primary" data-fav2="${s.id}">
            ${favs.has(s.id) ? esc(L.sheet.saved) : esc(L.sheet.save)}
          </button>
          <button class="btn btn-ghost" data-close>${esc(L.sheet.close)}</button>
        </div>
      </div>`;
    if (!sheet.open) {
      if (typeof sheet.showModal === 'function') sheet.showModal();
      else sheet.setAttribute('open', '');
    }
    const box = $('.sheet-in');
    if (box) box.scrollTop = 0;
  }

  sheet.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === sheet) {
      openId = null;
      sheet.close ? sheet.close() : sheet.removeAttribute('open');
      return;
    }
    const f = e.target.closest('[data-fav2]');
    if (f) {
      const id = f.dataset.fav2;
      favs.has(id) ? favs.delete(id) : favs.add(id);
      saveFavs();
      f.textContent = favs.has(id) ? L.sheet.saved : L.sheet.save;
      draw();
    }
  });
  sheet.addEventListener('close', () => { openId = null; });

  /* ====================================================
     Gesichtsform-Finder
     ==================================================== */
  let curFace = '';

  function renderFinder() {
    $('#faceBtns').innerHTML = FACE_KEYS.map(
      (k) => `
      <button class="face-btn${curFace === k ? ' on' : ''}" data-f="${k}">
        <svg viewBox="0 0 60 74" aria-hidden="true">
          <path d="${FACE_SHAPES[k]}" fill="none" stroke="currentColor" stroke-width="3.4"
                stroke-linejoin="round"/>
        </svg>
        <span>${esc(L.faces[k])}</span>
      </button>`
    ).join('');
    renderFaceOut();
  }

  function renderFaceOut() {
    if (!curFace) {
      $('#faceOut').innerHTML =
        `<h3>${esc(L.finder.hintTitle)}</h3>` +
        `<p style="color:var(--muted);margin:0">${esc(L.finder.hintText)}</p>`;
      return;
    }
    const a = L.advice[curFace];
    const rec = STYLES.filter((s) => s.id !== 'glatt' && s.faces.includes(curFace)).slice(0, 8);
    $('#faceOut').innerHTML = `
      <h3>${esc(a.title)}</h3>
      <p style="color:var(--muted);margin:0">${esc(a.text)}</p>
      <div class="rec">
        ${rec.map((s) => `<button data-open="${s.id}">${esc(s.name)}</button>`).join('')}
      </div>`;
  }

  $('#faceBtns').addEventListener('click', (e) => {
    const b = e.target.closest('.face-btn');
    if (!b) return;
    curFace = b.dataset.f;
    $$('.face-btn').forEach((x) => x.classList.toggle('on', x === b));
    renderFaceOut();
  });
  $('#faceOut').addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (b) openSheet(b.dataset.open);
  });

  /* ====================================================
     Statische Abschnitte
     ==================================================== */
  function renderStatic() {
    $$('[data-i18n]').forEach((el) => {
      const v = path(L, el.dataset.i18n);
      if (typeof v === 'string') el.textContent = v.replace(/&nbsp;/g, ' ');
    });
    $$('[data-i18n-html]').forEach((el) => {
      const v = path(L, el.dataset.i18nHtml);
      if (typeof v === 'string') el.innerHTML = bidi(v);
    });

    $('#themeBtn').title = L.themeTitle;
    $('#themeBtn').setAttribute('aria-label', L.themeTitle);
    $('#igLink').title = L.igTitle;
    $('#igLink').setAttribute('aria-label', L.igTitle);
    $('#langSwitch').setAttribute('title', L.langTitle);

    $('#kitGrid').innerHTML = L.kit.items
      .map(
        ([h, p], i) =>
          `<div class="info"><div class="num">${String(i + 1).padStart(2, '0')}</div>` +
          `<h3>${esc(h)}</h3><p>${esc(p)}</p></div>`
      )
      .join('');

    $('#carePlan').innerHTML = L.care.rows
      .map(([w, t]) => `<div class="plan-row"><b>${esc(w)}</b><p>${bidi(t)}</p></div>`)
      .join('');

    $('#faqList').innerHTML = L.faq.items
      .map(
        ([q, a]) =>
          `<details class="faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`
      )
      .join('');

    $('#stCount').textContent = STYLES.length;
    $('#stSteps').textContent =
      STYLES.reduce((n, s) => n + s.steps.length, 0) + L.photoSteps.length;
    $('#year').textContent = '© ' + new Date().getFullYear() + ' Bart_stil';

    $('#heroArt').innerHTML = ['vollbart', 'handlebar', 'goatee', 'ducktail']
      .map((id) => {
        const s = STYLES.find((x) => x.id === id);
        return `<div class="tile">${BeardArt.render(s.art, { label: s.name })}</div>`;
      })
      .join('');
  }

  /* ====================================================
     Sprachwechsel
     ==================================================== */
  function applyLang(code) {
    cur = code;
    L = LANG[cur];
    try { localStorage.setItem(LANG_KEY, cur); } catch (e) {}

    document.documentElement.lang = L.htmlLang;
    document.documentElement.dir = L.dir;
    $$('#langSwitch button').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.lang === cur))
    );

    buildStyles();
    renderStatic();
    renderFilters();
    renderCatRow();
    renderFinder();
    $('#faceStage').innerHTML = '<svg class="guides" id="guides" viewBox="0 0 340 300" aria-hidden="true"></svg>';
    renderTutorial();
    draw();
    if (openId) openSheet(openId);
  }

  $('#langSwitch').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-lang]');
    if (b) applyLang(b.dataset.lang);
  });

  /* ---------------------------------------------------- Nach oben */
  const toTop = $('#toTop');
  addEventListener('scroll', () => toTop.classList.toggle('show', scrollY > 700), { passive: true });
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  applyLang(cur);
})();
