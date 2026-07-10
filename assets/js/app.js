/* =========================================================================
   MatheMeister – Application core
   Hash router · theme · i18n · search · progress · rendering
   ========================================================================= */
(function () {
  "use strict";
  const { CATEGORIES, TOPICS, BLOG_POSTS, PATHS, QUIZZES } = window.MM_DATA;
  const I18N = window.MM_I18N;

  /* ---------------- State ---------------- */
  const store = {
    get lang() { return localStorage.getItem("mm_lang") || "de"; },
    set lang(v) { localStorage.setItem("mm_lang", v); },
    get theme() { return localStorage.getItem("mm_theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); },
    set theme(v) { localStorage.setItem("mm_theme", v); },
    get done() { return JSON.parse(localStorage.getItem("mm_done") || "[]"); },
    set done(v) { localStorage.setItem("mm_done", JSON.stringify(v)); },
    get favs() { return JSON.parse(localStorage.getItem("mm_favs") || "[]"); },
    set favs(v) { localStorage.setItem("mm_favs", JSON.stringify(v)); },
    get quizzes() { return JSON.parse(localStorage.getItem("mm_quizzes") || "[]"); },
    set quizzes(v) { localStorage.setItem("mm_quizzes", JSON.stringify(v)); },
    get user() { return JSON.parse(localStorage.getItem("mm_user") || "null"); },
    set user(v) { v ? localStorage.setItem("mm_user", JSON.stringify(v)) : localStorage.removeItem("mm_user"); }
  };

  const lang = () => store.lang;
  const L = (o) => !o ? "" : (typeof o === "string" ? o : (o[lang()] || o.de || ""));
  const t = (k) => (I18N[lang()] && I18N[lang()][k]) || (I18N.de[k]) || k;
  window.MM_t = t; window.MM_lang = lang;
  const topicById = (id) => TOPICS.find(x => x.id === id);
  const catById = (id) => CATEGORIES.find(x => x.id === id);
  const topicsOf = (cat) => TOPICS.filter(x => x.cat === cat);
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

  /* ---------------- Theme ---------------- */
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", store.theme);
    const btn = document.getElementById("themeBtn");
    if (btn) btn.innerHTML = store.theme === "dark" ? sun() : moon();
  }
  function toggleTheme() { store.theme = store.theme === "dark" ? "light" : "dark"; applyTheme(); }

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
  }

  /* ---------------- Icons (inline SVG) ---------------- */
  const svg = (p, vb="0 0 24 24") => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const moon = () => svg(`<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>`);
  const sun = () => svg(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>`);
  const iSearch = () => svg(`<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>`);
  const iArrow = () => svg(`<path d="M5 12h14M13 6l6 6-6 6"/>`);
  const iMenu = () => svg(`<path d="M4 6h16M4 12h16M4 18h16"/>`);
  const iCopy = () => svg(`<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>`);
  const iCheck = () => svg(`<path d="M20 6 9 17l-5-5"/>`);
  const iStar = (f) => `<svg viewBox="0 0 24 24" fill="${f?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l3 6.5 7 .8-5 4.8 1.3 7L12 18l-6.3 3.1L7 14 2 9.3l7-.8z"/></svg>`;

  /* section nav icons */
  const NAV = [
    { id:"home", route:"home", ico:"🏠", grp:"main" },
    { id:"paths", route:"paths", ico:"🧭", grp:"main" },
    { id:"exercises", route:"exercises", ico:"✏️", grp:"main" },
    { id:"dashboard", route:"dashboard", ico:"📊", grp:"main" }
  ];

  /* ---------------- Shell (header, sidebar, footer) ---------------- */
  function renderShell() {
    document.getElementById("header-slot").innerHTML = `
      <a class="brand" href="#/home" aria-label="MatheMeister">
        <span class="brand-mark">∑</span>
        <span class="brand-name">Mathe<b>Meister</b></span>
      </a>
      <button class="icon-btn menu-toggle" id="menuBtn" aria-label="${t("open_menu")}">${iMenu()}</button>
      <div class="header-search" id="headerSearchWrap">
        <span class="search-ico">${iSearch()}</span>
        <input id="globalSearch" type="search" autocomplete="off" placeholder="${t("search_placeholder")}" aria-label="${t("search_placeholder")}"/>
        <kbd>/</kbd>
      </div>
      <div class="header-actions">
        <select class="lang-select hide-sm" id="langSelect" aria-label="Sprache / Language">
          <option value="de" ${lang()==="de"?"selected":""}>DE</option>
          <option value="en" ${lang()==="en"?"selected":""}>EN</option>
        </select>
        <button class="icon-btn" id="themeBtn" aria-label="${t("theme_toggle")}">${store.theme==="dark"?sun():moon()}</button>
        <a class="btn-ghost hide-sm" href="#/account">${t("login")}</a>
      </div>`;

    // sidebar
    const learnLinks = CATEGORIES.map(c =>
      `<a class="nav-link" href="#/category/${c.id}" data-route="category/${c.id}"><span class="nav-ico">${c.icon}</span>${L(c.title)}</a>`).join("");
    document.getElementById("sidebar").innerHTML = `
      <nav aria-label="Hauptnavigation">
        <div class="nav-group">
          <a class="nav-link" href="#/home" data-route="home"><span class="nav-ico">🏠</span>${t("home")}</a>
          <a class="nav-link" href="#/paths" data-route="paths"><span class="nav-ico">🧭</span>${t("paths")}</a>
          <a class="nav-link" href="#/exercises" data-route="exercises"><span class="nav-ico">✏️</span>${t("exercises")}</a>
          <a class="nav-link" href="#/dashboard" data-route="dashboard"><span class="nav-ico">📊</span>${t("dashboard")}</a>
        </div>
        <div class="nav-group">
          <div class="nav-group-title">${t("nav_learn")}</div>
          ${learnLinks}
        </div>
        <div class="nav-group">
          <div class="nav-group-title">${t("nav_tools")}</div>
          <a class="nav-link" href="#/formulas" data-route="formulas"><span class="nav-ico">📋</span>${t("formulas")}</a>
          <a class="nav-link" href="#/calculators" data-route="calculators"><span class="nav-ico">🧮</span>${t("calculators")}</a>
        </div>
        <div class="nav-group">
          <div class="nav-group-title">${t("nav_more")}</div>
          <a class="nav-link" href="#/blog" data-route="blog"><span class="nav-ico">📝</span>${t("blog")}</a>
          <a class="nav-link" href="#/account" data-route="account"><span class="nav-ico">👤</span>${t("account")}</a>
        </div>
      </nav>`;

    // footer
    document.getElementById("footer-slot").innerHTML = `
      <div class="footer-inner">
        <div class="footer-brand footer-col">
          <a class="brand" href="#/home"><span class="brand-mark">∑</span><span class="brand-name">Mathe<b>Meister</b></span></a>
          <p>${t("footer_tag")}</p>
        </div>
        <div class="footer-col">
          <h4>${t("footer_learn")}</h4>
          ${CATEGORIES.slice(0,6).map(c=>`<a href="#/category/${c.id}">${L(c.title)}</a>`).join("")}
        </div>
        <div class="footer-col">
          <h4>${t("footer_tools")}</h4>
          <a href="#/formulas">${t("formulas")}</a>
          <a href="#/calculators">${t("calculators")}</a>
          <a href="#/exercises">${t("exercises")}</a>
          <a href="#/paths">${t("paths")}</a>
        </div>
        <div class="footer-col">
          <h4>${t("footer_about")}</h4>
          <a href="#/blog">${t("blog")}</a>
          <a href="#/dashboard">${t("dashboard")}</a>
          <a href="#/account">${t("account")}</a>
          <a href="#/home">${t("footer_contact")}</a>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} MatheMeister · ${t("footer_rights")}</div>`;

    applyTheme();
    wireShell();
  }

  function wireShell() {
    document.getElementById("themeBtn").onclick = toggleTheme;
    document.getElementById("langSelect").onchange = (e) => { store.lang = e.target.value; renderShell(); route(); };
    const menuBtn = document.getElementById("menuBtn");
    const sb = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    menuBtn.onclick = () => { sb.classList.toggle("open"); backdrop.classList.toggle("open"); };
    backdrop.onclick = () => { sb.classList.remove("open"); backdrop.classList.remove("open"); };
    sb.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { sb.classList.remove("open"); backdrop.classList.remove("open"); }));
    // search
    const gs = document.getElementById("globalSearch");
    gs.addEventListener("focus", openSearch);
    gs.addEventListener("input", () => { openSearch(); document.getElementById("searchInput").value = gs.value; runSearch(gs.value); });
  }

  function setActiveNav(route) {
    document.querySelectorAll("#sidebar .nav-link").forEach(a => {
      a.classList.toggle("active", a.dataset.route === route);
    });
  }

  /* ---------------- Search ---------------- */
  function buildIndex() {
    const idx = [];
    TOPICS.forEach(tp => idx.push({ type:"Thema", icon: catById(tp.cat).icon, title: L(tp.title),
      sub: L(catById(tp.cat).title), href:`#/topic/${tp.id}`, kw:(tp.tags.join(" ")+" "+L(tp.simple)).toLowerCase() }));
    CATEGORIES.forEach(c => idx.push({ type:"Bereich", icon:c.icon, title:L(c.title), sub:L(c.desc), href:`#/category/${c.id}`, kw:L(c.desc).toLowerCase() }));
    BLOG_POSTS.forEach(b => idx.push({ type:"Blog", icon:"📝", title:L(b.title), sub:L(b.excerpt), href:`#/blog/${b.id}`, kw:L(b.excerpt).toLowerCase() }));
    [["formulas","📋",t("formulas")],["calculators","🧮",t("calculators")],["exercises","✏️",t("exercises")],["paths","🧭",t("paths")]]
      .forEach(([r,i,ti]) => idx.push({ type:"Seite", icon:i, title:ti, sub:"", href:`#/${r}`, kw:ti.toLowerCase() }));
    // formulas as searchable
    TOPICS.forEach(tp => (tp.formulas||[]).forEach(f => idx.push({ type:"Formel", icon:"∑", title:L(f.name)+": "+f.eq, sub:L(tp.title), href:`#/topic/${tp.id}`, kw:(L(f.name)+" "+f.eq).toLowerCase() })));
    return idx;
  }
  let SEARCH_INDEX = [];
  let searchActive = -1, searchHits = [];

  function openSearch() {
    const ov = document.getElementById("searchOverlay");
    if (!ov.classList.contains("open")) { ov.classList.add("open"); const si = document.getElementById("searchInput"); si.value = document.getElementById("globalSearch").value || ""; runSearch(si.value); setTimeout(()=>si.focus(),20); }
  }
  function closeSearch() { document.getElementById("searchOverlay").classList.remove("open"); }
  function runSearch(q) {
    q = (q||"").trim().toLowerCase();
    const box = document.getElementById("searchResults");
    if (!q) { searchHits = SEARCH_INDEX.slice(0,8); }
    else {
      searchHits = SEARCH_INDEX.map(it => {
        const tl = it.title.toLowerCase();
        let s = 0; if (tl.startsWith(q)) s = 100; else if (tl.includes(q)) s = 60; else if (it.kw.includes(q)) s = 30;
        return { it, s };
      }).filter(x => x.s > 0).sort((a,b)=>b.s-a.s).slice(0,10).map(x=>x.it);
    }
    searchActive = -1;
    if (!searchHits.length) { box.innerHTML = `<div class="search-empty">${t("no_results")} 🔍</div>`; return; }
    box.innerHTML = searchHits.map((it,i)=>`
      <a class="search-result" href="${it.href}" data-i="${i}">
        <span class="sr-ico">${it.icon}</span>
        <span><b>${esc(it.title)}</b><span>${it.type}${it.sub?" · "+esc(it.sub):""}</span></span>
      </a>`).join("");
    box.querySelectorAll(".search-result").forEach(a => a.addEventListener("click", closeSearch));
  }
  function wireSearchOverlay() {
    const ov = document.getElementById("searchOverlay");
    const si = document.getElementById("searchInput");
    si.addEventListener("input", () => runSearch(si.value));
    ov.addEventListener("click", (e) => { if (e.target === ov) closeSearch(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
      if (e.key === "Escape") closeSearch();
      if (!ov.classList.contains("open")) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        searchActive = Math.max(0, Math.min(searchHits.length-1, searchActive + (e.key==="ArrowDown"?1:-1)));
        ov.querySelectorAll(".search-result").forEach((el,i)=>el.classList.toggle("active", i===searchActive));
      }
      if (e.key === "Enter" && searchActive >= 0 && searchHits[searchActive]) { location.hash = searchHits[searchActive].href.slice(1); closeSearch(); }
    });
  }

  /* ---------------- Progress helpers ---------------- */
  function isDone(id) { return store.done.includes(id); }
  function toggleDone(id) { const d = store.done; const i = d.indexOf(id); if (i>=0) d.splice(i,1); else d.push(id); store.done = d; }
  function isFav(id) { return store.favs.includes(id); }
  function toggleFav(id) { const f = store.favs; const i = f.indexOf(id); if (i>=0) f.splice(i,1); else f.push(id); store.favs = f; }
  function progressPct() { return Math.round(store.done.length / TOPICS.length * 100); }

  /* ---------------- Math graphics (SVG) ---------------- */
  function graphSVG(g) {
    const W=440,H=260,cx=W/2,cy=H/2, ax="var(--surface-line)", fn="var(--brand-500)";
    const axes = `<line x1="20" y1="${cy}" x2="${W-10}" y2="${cy}" stroke="${ax}"/><line x1="${cx}" y1="10" x2="${cx}" y2="${H-10}" stroke="${ax}"/>`;
    const sx = 24, sy = 24; // pixels per unit
    const toX = (x)=>cx + x*sx, toY = (y)=>cy - y*sy;
    if (g.type === "linear" || g.type === "quadratic") {
      let pts = []; for (let px=-8; px<=8; px+=0.25) { const y = g.type==="linear" ? g.m*px+g.b : g.a*px*px+g.b*px+g.c; if (Math.abs(y) <= 6) pts.push(`${toX(px).toFixed(1)},${toY(y).toFixed(1)}`); }
      return svgWrap(`${axes}<polyline points="${pts.join(" ")}" fill="none" stroke="${fn}" stroke-width="2.5"/>`);
    }
    if (g.type === "circle") return svgWrap(`${axes}<circle cx="${cx}" cy="${cy}" r="70" fill="color-mix(in srgb, var(--brand-500) 12%, transparent)" stroke="${fn}" stroke-width="2.5"/><line x1="${cx}" y1="${cy}" x2="${cx+70}" y2="${cy}" stroke="var(--accent-500)" stroke-width="2"/><text x="${cx+30}" y="${cy-8}" fill="var(--text-soft)" font-size="13">r</text>`);
    if (g.type === "triangle") return svgWrap(`${axes}<polygon points="${cx-80},${cy+50} ${cx+80},${cy+50} ${cx-10},${cy-60}" fill="color-mix(in srgb, var(--brand-500) 12%, transparent)" stroke="${fn}" stroke-width="2.5"/>`);
    if (g.type === "pythagoras") return svgWrap(`${axes}<polygon points="${cx-70},${cy+50} ${cx+70},${cy+50} ${cx-70},${cy-60}" fill="color-mix(in srgb, var(--accent-500) 12%, transparent)" stroke="${fn}" stroke-width="2.5"/><rect x="${cx-70}" y="${cy+35}" width="15" height="15" fill="none" stroke="var(--rose-500)"/><text x="${cx-4}" y="${cy+68}" fill="var(--text-soft)" font-size="13">a</text><text x="${cx-90}" y="${cy}" fill="var(--text-soft)" font-size="13">b</text><text x="${cx+5}" y="${cy-6}" fill="var(--text-soft)" font-size="13">c</text>`);
    if (g.type === "sine") { let pts=[]; for (let px=-Math.PI*2;px<=Math.PI*2;px+=0.1){ pts.push(`${toX(px).toFixed(1)},${toY(Math.sin(px)*2.2).toFixed(1)}`);} return svgWrap(`${axes}<polyline points="${pts.join(" ")}" fill="none" stroke="${fn}" stroke-width="2.5"/>`); }
    return "";
  }
  function svgWrap(inner) { return `<div class="card card-pad" style="text-align:center;overflow-x:auto"><svg viewBox="0 0 440 260" style="max-width:440px;width:100%;font-family:var(--font-mono)">${inner}</svg></div>`; }

  /* ---------------- PAGES ---------------- */
  const app = () => document.getElementById("app");

  function pageHome() {
    const popular = ["prozentrechnung","pythagoras","ableitungen","quadratische-funktionen","brueche","wahrscheinlichkeit"].map(topicById);
    const latest = BLOG_POSTS.slice(0,3);
    const pct = progressPct();
    return `
    <section class="hero reveal">
      <span class="hero-float" style="top:12%;right:8%;font-size:5rem">π</span>
      <span class="hero-float" style="bottom:14%;right:22%;font-size:3.5rem">∫</span>
      <span class="hero-float" style="top:40%;right:38%;font-size:2.5rem">∑</span>
      <span class="eyebrow">${t("hero_eyebrow")}</span>
      <h1>${t("hero_title")}</h1>
      <p>${t("hero_sub")}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#/category/grundlagen">${t("hero_cta1")} ${iArrow()}</a>
        <a class="btn btn-outline" href="#/paths">${t("hero_cta2")}</a>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><b>${TOPICS.length}+</b><span>${t("stat_topics")}</span></div>
        <div class="hero-stat"><b>${Object.values(QUIZZES).reduce((a,q)=>a+q.length,0)*40}+</b><span>${t("stat_exercises")}</span></div>
        <div class="hero-stat"><b>5</b><span>${t("stat_calc")}</span></div>
        <div class="hero-stat"><b>100%</b><span>${t("stat_free")}</span></div>
      </div>
    </section>

    <section class="block reveal-2" style="margin-top:36px">
      <span class="eyebrow">${t("your_progress")}</span>
      <h2 class="section-title">${t("your_progress")}</h2>
      <div class="card card-pad" style="display:flex;gap:26px;align-items:center;flex-wrap:wrap">
        <div class="ring" style="--p:${pct};position:relative"><b>${pct}%</b></div>
        <div style="flex:1;min-width:200px">
          <p class="lead" style="margin-bottom:14px">${t("progress_sub")}</p>
          <div class="progress-bar"><i style="width:${pct}%"></i></div>
          <p style="color:var(--text-muted);font-size:.86rem;margin-top:8px">${store.done.length} / ${TOPICS.length} ${t("topics_count")}</p>
          <a class="btn btn-outline" style="margin-top:12px" href="#/dashboard">${t("dashboard")} ${iArrow()}</a>
        </div>
      </div>
    </section>

    <section class="block reveal-2">
      <span class="eyebrow">${t("popular")}</span>
      <h2 class="section-title">${t("popular")}</h2>
      <p class="lead">${t("popular_sub")}</p>
      <div class="grid grid-3" style="margin-top:18px">
        ${popular.map(tp=>`<a class="card cat-card hoverable" href="#/topic/${tp.id}">
          <div class="cat-ico" style="background:color-mix(in srgb,${catById(tp.cat).color} 15%,transparent);color:${catById(tp.cat).color}">${catById(tp.cat).icon}</div>
          <h3>${L(tp.title)}</h3><p>${L(tp.simple).slice(0,80)}…</p>
          <div class="cat-meta">${L(catById(tp.cat).title)} ${isDone(tp.id)?'· <span class="pill green">✓</span>':''}</div>
        </a>`).join("")}
      </div>
    </section>

    <section class="block">
      <span class="eyebrow">${t("areas")}</span>
      <h2 class="section-title">${t("areas")}</h2>
      <p class="lead">${t("areas_sub")}</p>
      <div class="grid grid-3" style="margin-top:18px">
        ${CATEGORIES.map(c=>`<a class="card cat-card hoverable" href="#/category/${c.id}">
          <div class="cat-ico" style="background:color-mix(in srgb,${c.color} 15%,transparent);color:${c.color}">${c.icon}</div>
          <h3>${L(c.title)}</h3><p>${L(c.desc)}</p>
          <div class="cat-meta">${topicsOf(c.id).length} ${t("topics_count")} ${iArrow()}</div>
        </a>`).join("")}
      </div>
    </section>

    <section class="block">
      <span class="eyebrow">${t("latest")}</span>
      <h2 class="section-title">${t("latest")}</h2>
      <p class="lead">${t("latest_sub")}</p>
      <div class="grid grid-3" style="margin-top:18px">
        ${latest.map(b=>blogCard(b)).join("")}
      </div>
    </section>`;
  }

  function pageCategory(id) {
    const c = catById(id); if (!c) return page404();
    const tps = topicsOf(id);
    return `
    ${breadcrumb([[t("home"),"#/home"],[L(c.title),null]])}
    <div class="reveal">
      <div style="display:flex;gap:16px;align-items:center;margin-bottom:8px">
        <div class="cat-ico" style="width:60px;height:60px;font-size:1.8rem;background:color-mix(in srgb,${c.color} 15%,transparent);color:${c.color}">${c.icon}</div>
        <div><span class="eyebrow">${t("nav_learn")}</span><h1 style="margin:2px 0 0;font-size:2rem">${L(c.title)}</h1></div>
      </div>
      <p class="lead">${L(c.desc)}</p>
      <div class="card" style="margin-top:22px;overflow:hidden">
        ${tps.map((tp,i)=>`<a class="topic-row" href="#/topic/${tp.id}" style="border-bottom:${i<tps.length-1?'1px solid var(--surface-line)':'0'}">
          <span class="t-num">${i+1}</span>
          <span class="t-body"><b>${L(tp.title)} ${isDone(tp.id)?'<span class="pill green" style="margin-left:6px">✓</span>':''}${isFav(tp.id)?'<span class="pill amber" style="margin-left:4px">★</span>':''}</b><span>${L(tp.simple).slice(0,90)}…</span></span>
          <span class="t-arrow">${iArrow()}</span>
        </a>`).join("")}
      </div>
      ${QUIZZES[id] ? `<div class="card card-pad" style="margin-top:22px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
        <div><b style="font-size:1.05rem">${t("start_quiz")}: ${L(c.title)}</b><p style="color:var(--text-soft);margin:4px 0 0">${QUIZZES[id].length} ${t("question")}s · ${t("exercises_sub")}</p></div>
        <a class="btn btn-primary" href="#/quiz/${id}">${t("start_quiz")} ${iArrow()}</a></div>` : ""}
    </div>`;
  }

  function pageTopic(id) {
    const tp = topicById(id); if (!tp) return page404();
    const c = catById(tp.cat);
    const siblings = topicsOf(tp.cat);
    const idx = siblings.findIndex(x => x.id === id);
    const prev = siblings[idx-1], next = siblings[idx+1];
    const block = (icoClass, ico, title, body) => `<section class="block"><h2><span class="b-ico ${icoClass}">${ico}</span>${title}</h2>${body}</section>`;

    let html = `${breadcrumb([[t("home"),"#/home"],[L(c.title),`#/category/${c.id}`],[L(tp.title),null]])}
    <article class="article reveal">
      <span class="eyebrow" style="color:${c.color}">${L(c.title)}</span>
      <h1>${L(tp.title)}</h1>
      <p class="lead">${L(tp.simple)}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">${tp.tags.slice(0,5).map(x=>`<span class="pill">${esc(x)}</span>`).join("")}</div>`;

    if (L(tp.detailed)) html += block("blue","📖",t("detailed"),`<div class="prose">${L(tp.detailed)}</div>`);
    if (tp.graphic) html += block("violet","📈",t("graphic"), graphSVG(tp.graphic));

    if (tp.examples && tp.examples.length) {
      html += `<section class="block"><h2><span class="b-ico green">💡</span>${t("example")} & ${t("step_solution")}</h2>` +
        tp.examples.map(ex=>`<div class="example"><div class="example-head">${iCheckMini()} ${L(ex.q)}</div><div class="example-body"><ol class="steps">${ex.steps.map(s=>`<li>${L(s)}</li>`).join("")}</ol>${ex.answer?`<div class="callout tip" style="margin-top:12px"><span class="c-ico">✅</span><div><strong>${t("result")}:</strong> ${esc(ex.answer)}</div></div>`:""}</div></div>`).join("") + `</section>`;
    }
    if (tp.formulas && tp.formulas.length) {
      html += block("blue","∑",t("formulas_of_topic"), tp.formulas.map(f=>`<div class="formula"><strong style="font-family:var(--font)">${L(f.name)}:</strong>&nbsp; ${esc(f.eq)}</div>`).join(""));
    }
    if (tp.mistakes && tp.mistakes.length) {
      html += block("rose","⚠️",t("mistakes"),`<ul class="mistakes">${tp.mistakes.map(m=>`<li>${L(m)}</li>`).join("")}</ul>`);
    }
    if (tp.exercises && tp.exercises.length) {
      html += `<section class="block"><h2><span class="b-ico amber">✏️</span>${t("practice")}</h2>` +
        tp.exercises.map((ex,i)=>`<div class="exercise"><div class="q">${i+1}. ${L(ex.q)}</div><details class="solution"><summary>${t("solution")}</summary><div class="sol-body">${L(ex.sol)}</div></details></div>`).join("") + `</section>`;
    }

    html += `<div class="topic-actions">
      <button class="btn ${isDone(id)?'btn-primary done-btn is-done':'btn-outline done-btn'}" id="doneBtn">${iCheck()} <span>${isDone(id)?t("marked_done"):t("mark_done")}</span></button>
      <button class="btn btn-outline" id="favBtn">${iStar(isFav(id))} <span>${isFav(id)?t("favorited"):t("favorite")}</span></button>
    </div>
    <div class="topic-nav">
      ${prev?`<a href="#/topic/${prev.id}"><span>${t("prev")}</span><b>${L(prev.title)}</b></a>`:`<span></span>`}
      ${next?`<a class="tn-next" href="#/topic/${next.id}"><span>${t("next")}</span><b>${L(next.title)}</b></a>`:`<span></span>`}
    </div>
    </article>`;
    return html;
  }
  function iCheckMini(){ return `<span style="color:var(--brand-500)">▹</span>`; }

  function wireTopic(id) {
    const d = document.getElementById("doneBtn");
    if (d) d.onclick = () => { toggleDone(id); toast(isDone(id)?t("marked_done"):"—"); route(); };
    const f = document.getElementById("favBtn");
    if (f) f.onclick = () => { toggleFav(id); toast(isFav(id)?t("favorited"):"—"); route(); };
  }

  function pagePaths() {
    return `${breadcrumb([[t("home"),"#/home"],[t("paths"),null]])}
    <div class="reveal"><span class="eyebrow">${t("nav_learn")}</span>
    <h1 style="font-size:2rem;margin:4px 0 6px">${t("paths_title")}</h1>
    <p class="lead">${t("paths_sub")}</p>
    <div class="grid grid-3" style="margin-top:22px">
    ${PATHS.map(p=>{
      const done = p.topics.filter(isDone).length; const pct = Math.round(done/p.topics.length*100);
      return `<div class="card card-pad hoverable">
        <div class="cat-ico" style="background:color-mix(in srgb,${p.color} 15%,transparent);color:${p.color};font-size:1.6rem">${p.icon}</div>
        <h3 style="margin:12px 0 4px">${L(p.title)}</h3>
        <p style="color:var(--text-soft);font-size:.9rem">${L(p.desc)}</p>
        <div class="progress-bar" style="margin:12px 0 6px"><i style="width:${pct}%"></i></div>
        <p style="color:var(--text-muted);font-size:.8rem">${done}/${p.topics.length} ${t("topics_count")}</p>
        <div style="margin-top:12px">${p.topics.map(tid=>{const tp=topicById(tid);return `<a class="nav-link" href="#/topic/${tid}" style="padding:7px 10px">${isDone(tid)?'✅':'▫️'} ${L(tp.title)}</a>`}).join("")}</div>
      </div>`;
    }).join("")}
    </div></div>`;
  }

  function pageExercises() {
    return `${breadcrumb([[t("home"),"#/home"],[t("exercises"),null]])}
    <div class="reveal"><span class="eyebrow">${t("nav_tools")}</span>
    <h1 style="font-size:2rem;margin:4px 0 6px">${t("exercises_title")}</h1>
    <p class="lead">${t("exercises_sub")}</p>
    <div class="grid grid-3" style="margin-top:22px">
    ${Object.keys(QUIZZES).map(cid=>{const c=catById(cid);return `<div class="card cat-card hoverable">
      <div class="cat-ico" style="background:color-mix(in srgb,${c.color} 15%,transparent);color:${c.color}">${c.icon}</div>
      <h3>${L(c.title)}</h3><p>${QUIZZES[cid].length} ${t("question")}s</p>
      <a class="btn btn-primary" style="margin-top:auto" href="#/quiz/${cid}">${t("start_quiz")} ${iArrow()}</a>
    </div>`}).join("")}
    </div></div>`;
  }

  /* ---- Quiz engine ---- */
  let quizState = null;
  function pageQuiz(cid) {
    const c = catById(cid), qs = QUIZZES[cid]; if (!qs) return page404();
    quizState = { cid, i:0, score:0, answered:false };
    return `${breadcrumb([[t("home"),"#/home"],[t("exercises"),"#/exercises"],[L(c.title),null]])}
    <div class="quiz reveal" id="quizRoot"></div>`;
  }
  function renderQuiz() {
    const root = document.getElementById("quizRoot"); if (!root) return;
    const { cid, i } = quizState; const qs = QUIZZES[cid]; const c = catById(cid);
    if (i >= qs.length) {
      const pct = Math.round(quizState.score/qs.length*100);
      const rec = store.quizzes; rec.push({ cid, score:quizState.score, total:qs.length, date:Date.now() }); store.quizzes = rec;
      root.innerHTML = `<div class="card card-pad quiz-result">
        <div style="font-size:3rem">${pct>=80?'🏆':pct>=50?'👍':'📚'}</div>
        <h2>${t("quiz_done")}</h2>
        <div class="qr-score">${quizState.score}/${qs.length}</div>
        <p class="lead" style="margin:8px auto 20px">${t("your_score")}: ${pct}%</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" id="quizRetry">${t("retry")}</button>
          <a class="btn btn-outline" href="#/exercises">${t("back_overview")}</a>
        </div></div>`;
      document.getElementById("quizRetry").onclick = () => { quizState = { cid, i:0, score:0, answered:false }; renderQuiz(); };
      return;
    }
    const q = qs[i]; const keys = ["A","B","C","D"];
    root.innerHTML = `
      <span class="eyebrow" style="color:${c.color}">${L(c.title)}</span>
      <div class="quiz-progress">${qs.map((_,k)=>`<i class="${k<i?'done':''}"></i>`).join("")}</div>
      <p style="color:var(--text-muted);font-size:.85rem">${t("question")} ${i+1} ${t("of")} ${qs.length}</p>
      <div class="quiz-q">${L(q.q)}</div>
      <div class="quiz-opts" id="quizOpts">
        ${q.opts.map((o,k)=>`<button class="quiz-opt" data-k="${k}"><span class="qo-key">${keys[k]}</span>${esc(o)}</button>`).join("")}
      </div>
      <div id="quizFb"></div>`;
    root.querySelectorAll(".quiz-opt").forEach(btn => btn.onclick = () => {
      if (quizState.answered) return; quizState.answered = true;
      const k = +btn.dataset.k; const correct = q.correct;
      root.querySelectorAll(".quiz-opt").forEach((b,bi)=>{ b.disabled = true; if (bi===correct) b.classList.add("correct"); if (bi===k && k!==correct) b.classList.add("wrong"); });
      const ok = k === correct; if (ok) quizState.score++;
      document.getElementById("quizFb").innerHTML = `<div class="quiz-feedback callout ${ok?'tip':'warn'}"><span class="c-ico">${ok?'✅':'❌'}</span><div><strong>${ok?t("correct"):t("wrong")}</strong> ${L(q.exp)}</div></div>
        <button class="btn btn-primary" id="quizNext" style="margin-top:16px">${t("next_q")} ${iArrow()}</button>`;
      document.getElementById("quizNext").onclick = () => { quizState.i++; quizState.answered = false; renderQuiz(); };
    });
  }

  /* ---- Formulas collection ---- */
  function pageFormulas() {
    const groups = CATEGORIES.map(c => ({ c, items: topicsOf(c.id).flatMap(tp => (tp.formulas||[]).map(f => ({ name:L(f.name), eq:f.eq, topic:L(tp.title), tid:tp.id }))) })).filter(g=>g.items.length);
    return `${breadcrumb([[t("home"),"#/home"],[t("formulas"),null]])}
    <div class="reveal"><span class="eyebrow">${t("nav_tools")}</span>
    <h1 style="font-size:2rem;margin:4px 0 6px">${t("formulas_title")}</h1>
    <p class="lead">${t("formulas_sub")}</p>
    <div class="formula-search"><span class="search-ico">${iSearch()}</span><input id="formulaSearch" type="search" placeholder="${t("formula_search")}"></div>
    <div id="formulaList">
    ${groups.map(g=>`<div class="formula-cat" data-cat>
      <h3>${g.c.icon} ${L(g.c.title)}</h3>
      ${g.items.map(it=>`<div class="formula-item" data-name="${esc((it.name+" "+it.eq+" "+it.topic).toLowerCase())}">
        <div><div class="fi-name">${esc(it.name)} <a href="#/topic/${it.tid}" style="font-size:.78rem;color:var(--text-muted)">· ${esc(it.topic)}</a></div></div>
        <div style="display:flex;align-items:center;gap:8px"><span class="fi-eq">${esc(it.eq)}</span><button class="fi-copy" data-eq="${esc(it.eq)}" title="${t("copied")}">${iCopy()}</button></div>
      </div>`).join("")}
    </div>`).join("")}
    </div></div>`;
  }
  function wireFormulas() {
    const inp = document.getElementById("formulaSearch");
    if (inp) inp.oninput = () => {
      const q = inp.value.trim().toLowerCase();
      document.querySelectorAll(".formula-item").forEach(it => { it.style.display = it.dataset.name.includes(q) ? "" : "none"; });
      document.querySelectorAll(".formula-cat").forEach(cat => { const vis = [...cat.querySelectorAll(".formula-item")].some(x=>x.style.display!=="none"); cat.style.display = vis?"":"none"; });
    };
    document.querySelectorAll(".fi-copy").forEach(b => b.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(b.dataset.eq); toast(t("copied")); });
  }

  /* ---- Calculators ---- */
  function pageCalculators() {
    return `${breadcrumb([[t("home"),"#/home"],[t("calculators"),null]])}
    <div class="reveal"><span class="eyebrow">${t("nav_tools")}</span>
    <h1 style="font-size:2rem;margin:4px 0 6px">${t("calc_title")}</h1>
    <p class="lead">${t("calc_sub")}</p>
    <div class="calc-grid" style="margin-top:22px">

      <div class="card calc" id="calcBasic">
        <h3>🧮 ${t("calc_basic")}</h3><p class="calc-sub">${t("calc_basic_sub")}</p>
        <div class="calc-display"><small id="calcSub"></small><span id="calcDisplay">0</span></div>
        <div class="keypad">
          <button class="fn" data-val="sin(">sin</button><button class="fn" data-val="cos(">cos</button><button class="fn" data-val="tan(">tan</button><button class="fn" data-val="sqrt(">√</button>
          <button class="fn" data-val="(">(</button><button class="fn" data-val=")">)</button><button class="fn" data-val="^">xʸ</button><button class="fn" data-val="π">π</button>
          <button data-act="clear">C</button><button data-act="del">⌫</button><button class="op" data-val="%">%</button><button class="op" data-val="/">÷</button>
          <button data-val="7">7</button><button data-val="8">8</button><button data-val="9">9</button><button class="op" data-val="*">×</button>
          <button data-val="4">4</button><button data-val="5">5</button><button data-val="6">6</button><button class="op" data-val="-">−</button>
          <button data-val="1">1</button><button data-val="2">2</button><button data-val="3">3</button><button class="op" data-val="+">+</button>
          <button data-val="0">0</button><button data-val=".">.</button><button class="eq" data-act="eq">=</button>
        </div>
      </div>

      <div class="card calc" id="calcPercent">
        <h3>％ ${t("calc_percent")}</h3><p class="calc-sub">${t("calc_percent_sub")}</p>
        <div class="field"><label>Grundwert (G)</label><input type="number" id="pG" step="any" placeholder="z.B. 250"></div>
        <div class="field"><label>Prozentsatz (%)</label><input type="number" id="pP" step="any" placeholder="z.B. 20"></div>
        <div class="field"><label>Prozentwert (W) – optional</label><input type="number" id="pW" step="any" placeholder="optional"></div>
        <button class="btn btn-primary" id="pCalc" style="width:100%">${t("compute")}</button>
        <div class="calc-result" id="pResult">${t("result")} …</div>
      </div>

      <div class="card calc" id="calcFraction">
        <h3>½ ${t("calc_fraction")}</h3><p class="calc-sub">${t("calc_fraction_sub")}</p>
        <div class="field-row"><div class="field"><label>Zähler</label><input type="number" id="fa" value="1"></div><div class="field"><label>Nenner</label><input type="number" id="fb" value="2"></div></div>
        <div class="field"><label>Operation</label><select id="fOp"><option value="+">+</option><option value="-">−</option><option value="*">×</option><option value="/">÷</option></select></div>
        <div class="field-row"><div class="field"><label>Zähler</label><input type="number" id="fc" value="1"></div><div class="field"><label>Nenner</label><input type="number" id="fd" value="3"></div></div>
        <button class="btn btn-primary" id="fCalc" style="width:100%">${t("compute")}</button>
        <div class="calc-result" id="fResult">${t("result")} …</div>
      </div>

      <div class="card calc" id="calcEquation">
        <h3>x² ${t("calc_equation")}</h3><p class="calc-sub">${t("calc_equation_sub")}: ax² + bx + c = 0</p>
        <div class="field-row"><div class="field"><label>a</label><input type="number" id="eA" value="1" step="any"></div><div class="field"><label>b</label><input type="number" id="eB" value="-5" step="any"></div><div class="field"><label>c</label><input type="number" id="eC" value="6" step="any"></div></div>
        <button class="btn btn-primary" id="eCalc" style="width:100%">${t("compute")}</button>
        <div class="calc-result" id="eResult">${t("result")} …</div>
      </div>

      <div class="card calc" id="calcGeometry">
        <h3>📐 ${t("calc_geometry")}</h3><p class="calc-sub">${t("calc_geometry_sub")}</p>
        <div class="field"><label>Form</label><select id="gShape"></select></div>
        <div id="gFields"></div>
        <button class="btn btn-primary" id="gCalc" style="width:100%">${t("compute")}</button>
        <div class="calc-result" id="gResult">${t("result")} …</div>
      </div>

    </div></div>`;
  }
  function wireCalculators() {
    const C = window.MM_CALC;
    C.initBasic(document.getElementById("calcBasic"));
    C.initPercent(document.getElementById("calcPercent"));
    C.initFraction(document.getElementById("calcFraction"));
    C.initEquation(document.getElementById("calcEquation"));
    C.initGeometry(document.getElementById("calcGeometry"));
  }

  /* ---- Dashboard ---- */
  function pageDashboard() {
    const pct = progressPct();
    const doneTopics = store.done.map(topicById).filter(Boolean);
    const favTopics = store.favs.map(topicById).filter(Boolean);
    const activeAreas = new Set(store.done.map(id => topicById(id)?.cat).filter(Boolean)).size;
    const catProgress = CATEGORIES.map(c => ({ c, done: topicsOf(c.id).filter(tp=>isDone(tp.id)).length, total: topicsOf(c.id).length }));
    return `${breadcrumb([[t("home"),"#/home"],[t("dashboard"),null]])}
    <div class="reveal">
    <span class="eyebrow">${store.user?t("logged_in_as")+" "+esc(store.user.name):t("nav_more")}</span>
    <h1 style="font-size:2rem;margin:4px 0 6px">${t("dash_title")}</h1>
    <p class="lead">${t("dash_sub")}</p>

    <div class="grid grid-4" style="margin-top:22px">
      <div class="card stat-tile"><div class="st-val">${store.done.length}</div><div class="st-label">${t("completed")}</div></div>
      <div class="card stat-tile"><div class="st-val">${store.favs.length}</div><div class="st-label">${t("favorites")}</div></div>
      <div class="card stat-tile"><div class="st-val">${store.quizzes.length}</div><div class="st-label">${t("quizzes_taken")}</div></div>
      <div class="card stat-tile"><div class="st-val">${activeAreas}</div><div class="st-label">${t("streak")}</div></div>
    </div>

    <div class="grid grid-2" style="margin-top:22px">
      <div class="card card-pad">
        <h3 style="margin-top:0">${t("your_progress")}</h3>
        <div class="ring-wrap"><div class="ring" style="--p:${pct};position:relative"><b>${pct}%</b></div>
        <div style="flex:1">${catProgress.map(cp=>`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:3px"><span>${cp.c.icon} ${L(cp.c.title)}</span><span style="color:var(--text-muted)">${cp.done}/${cp.total}</span></div><div class="progress-bar"><i style="width:${cp.total?Math.round(cp.done/cp.total*100):0}%"></i></div></div>`).join("")}</div>
        </div>
      </div>
      <div class="card card-pad">
        <h3 style="margin-top:0">${t("recent")}</h3>
        ${doneTopics.length ? doneTopics.slice(-6).reverse().map(tp=>`<a class="nav-link" href="#/topic/${tp.id}">✅ ${L(tp.title)}</a>`).join("") : `<p style="color:var(--text-muted)">${t("no_recent")}</p>`}
        <h3 style="margin:20px 0 8px">${t("fav_topics")}</h3>
        ${favTopics.length ? favTopics.map(tp=>`<a class="nav-link" href="#/topic/${tp.id}">★ ${L(tp.title)}</a>`).join("") : `<p style="color:var(--text-muted)">${t("no_fav")}</p>`}
      </div>
    </div>
    <div style="margin-top:22px"><button class="btn btn-outline" id="resetBtn">${t("reset_progress")}</button></div>
    </div>`;
  }
  function wireDashboard() {
    const b = document.getElementById("resetBtn");
    if (b) b.onclick = () => { if (confirm(t("reset_progress")+"?")) { store.done=[]; store.favs=[]; store.quizzes=[]; toast("✓"); route(); } };
  }

  /* ---- Account / auth ---- */
  function pageAccount() {
    if (store.user) {
      return `${breadcrumb([[t("home"),"#/home"],[t("account"),null]])}
      <div class="auth-wrap reveal"><div class="card auth-card" style="text-align:center">
        <div class="cat-ico" style="margin:0 auto 12px;width:64px;height:64px;font-size:1.8rem;background:var(--brand-50);color:var(--brand-600)">👤</div>
        <h2 style="margin:0">${t("welcome_back")}, ${esc(store.user.name)}!</h2>
        <p style="color:var(--text-soft)">${esc(store.user.email)}</p>
        <div class="grid grid-3" style="margin:20px 0">
          <div class="stat-tile"><div class="st-val">${store.done.length}</div><div class="st-label">${t("completed")}</div></div>
          <div class="stat-tile"><div class="st-val">${store.favs.length}</div><div class="st-label">${t("favorites")}</div></div>
          <div class="stat-tile"><div class="st-val">${store.quizzes.length}</div><div class="st-label">${t("quizzes_taken")}</div></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:center">
          <a class="btn btn-primary" href="#/dashboard">${t("dashboard")}</a>
          <button class="btn btn-outline" id="logoutBtn">${t("logout")}</button>
        </div>
        <p class="callout info" style="margin-top:18px;font-size:.82rem"><span class="c-ico">ℹ️</span><span>${t("demo_note")}</span></p>
      </div></div>`;
    }
    return `${breadcrumb([[t("home"),"#/home"],[t("account"),null]])}
    <div class="auth-wrap reveal"><div class="card auth-card">
      <h2 style="margin-top:0;text-align:center">${t("account_title")}</h2>
      <div class="auth-tabs"><button class="active" data-tab="login">${t("login_tab")}</button><button data-tab="register">${t("register_tab")}</button></div>
      <form id="authForm">
        <div class="field" id="nameField" style="display:none"><label>${t("name")}</label><input type="text" id="auName" placeholder="Max Mustermann"></div>
        <div class="field"><label>${t("email")}</label><input type="email" id="auEmail" required placeholder="du@beispiel.de"></div>
        <div class="field"><label>${t("password")}</label><input type="password" id="auPass" required minlength="4" placeholder="••••••"></div>
        <button class="btn btn-primary" type="submit" id="authSubmit" style="width:100%">${t("login_btn")}</button>
      </form>
      <p class="callout info" style="margin-top:18px;font-size:.82rem"><span class="c-ico">ℹ️</span><span>${t("demo_note")}</span></p>
    </div></div>`;
  }
  function wireAccount() {
    const lo = document.getElementById("logoutBtn");
    if (lo) { lo.onclick = () => { store.user = null; toast("✓"); route(); }; return; }
    let mode = "login";
    const tabs = document.querySelectorAll(".auth-tabs button");
    const nameField = document.getElementById("nameField");
    const submit = document.getElementById("authSubmit");
    tabs.forEach(b => b.onclick = () => {
      mode = b.dataset.tab; tabs.forEach(x=>x.classList.toggle("active", x===b));
      nameField.style.display = mode==="register"?"block":"none";
      submit.textContent = mode==="register"?t("register_btn"):t("login_btn");
    });
    document.getElementById("authForm").onsubmit = (e) => {
      e.preventDefault();
      const email = document.getElementById("auEmail").value;
      const name = (document.getElementById("auName").value || email.split("@")[0]);
      store.user = { name, email };
      toast(t("welcome_back")+"!"); location.hash = "/dashboard";
    };
  }

  /* ---- Blog ---- */
  function blogCard(b) {
    return `<a class="card hoverable" href="#/blog/${b.id}" style="overflow:hidden;display:block">
      <div style="height:110px;background:linear-gradient(135deg,var(--brand-500),var(--violet-500));display:grid;place-items:center;font-size:2.4rem">${b.id==="warum-mathematik"?"π":b.id==="mathe-im-alltag"?"🧮":b.id==="haeufige-fehler"?"⚠️":"🎯"}</div>
      <div class="card-pad"><span class="pill brand">${L(b.cat)}</span>
      <h3 style="margin:10px 0 6px;font-size:1.05rem">${L(b.title)}</h3>
      <p style="color:var(--text-soft);font-size:.88rem;margin:0">${L(b.excerpt)}</p>
      <div style="color:var(--text-muted);font-size:.78rem;margin-top:10px">${b.date} · ${b.read} ${t("min_read")}</div></div></a>`;
  }
  function pageBlog() {
    return `${breadcrumb([[t("home"),"#/home"],[t("blog"),null]])}
    <div class="reveal"><span class="eyebrow">${t("nav_more")}</span>
    <h1 style="font-size:2rem;margin:4px 0 6px">${t("blog_title")}</h1>
    <p class="lead">${t("blog_sub")}</p>
    <div class="grid grid-3" style="margin-top:22px">${BLOG_POSTS.map(blogCard).join("")}</div></div>`;
  }
  function pageBlogPost(id) {
    const b = BLOG_POSTS.find(x=>x.id===id); if (!b) return page404();
    return `${breadcrumb([[t("home"),"#/home"],[t("blog"),"#/blog"],[L(b.title),null]])}
    <article class="article reveal">
      <span class="pill brand">${L(b.cat)}</span>
      <h1 style="margin:12px 0 8px">${L(b.title)}</h1>
      <div style="color:var(--text-muted);font-size:.85rem;margin-bottom:20px">${b.date} · ${b.read} ${t("min_read")}</div>
      <div class="prose" style="font-size:1.02rem">${L(b.body)}</div>
      <a class="btn btn-outline" style="margin-top:26px" href="#/blog">← ${t("back_blog")}</a>
    </article>`;
  }

  function page404() {
    return `<div class="reveal" style="text-align:center;padding:60px 20px">
      <div style="font-size:4rem">🧭</div>
      <h1 style="font-size:2rem">${t("not_found")}</h1>
      <p class="lead" style="margin:0 auto 20px">${t("not_found_sub")}</p>
      <a class="btn btn-primary" href="#/home">${t("go_home")}</a></div>`;
  }

  /* ---- shared UI ---- */
  function breadcrumb(items) {
    return `<nav class="breadcrumb" aria-label="Breadcrumb">${items.map((it,i)=>`${it[1]?`<a href="${it[1]}">${esc(it[0])}</a>`:`<span>${esc(it[0])}</span>`}${i<items.length-1?'<span class="sep">/</span>':''}`).join("")}</nav>`;
  }

  /* ---------------- Router ---------------- */
  function route() {
    const hash = location.hash.replace(/^#\/?/, "") || "home";
    const parts = hash.split("/");
    const root = app();
    let html, after = null, navRoute = parts[0];
    switch (parts[0]) {
      case "home": html = pageHome(); break;
      case "category": html = pageCategory(parts[1]); navRoute = "category/"+parts[1]; break;
      case "topic": html = pageTopic(parts[1]); after = () => wireTopic(parts[1]); navRoute = "category/"+(topicById(parts[1])||{}).cat; break;
      case "paths": html = pagePaths(); break;
      case "exercises": html = pageExercises(); break;
      case "quiz": html = pageQuiz(parts[1]); after = renderQuiz; navRoute = "exercises"; break;
      case "formulas": html = pageFormulas(); after = wireFormulas; break;
      case "calculators": html = pageCalculators(); after = wireCalculators; break;
      case "dashboard": html = pageDashboard(); after = wireDashboard; break;
      case "account": html = pageAccount(); after = wireAccount; break;
      case "blog": html = parts[1] ? pageBlogPost(parts[1]) : pageBlog(); break;
      default: html = page404();
    }
    root.innerHTML = `<div class="view-enter">${html}</div>`;
    setActiveNav(navRoute);
    document.title = pageTitle(parts) + " · MatheMeister";
    updateMeta(parts);
    window.scrollTo(0, 0);
    if (after) after();
  }

  function pageTitle(parts) {
    if (parts[0]==="topic") { const tp=topicById(parts[1]); return tp?L(tp.title):t("not_found"); }
    if (parts[0]==="category") { const c=catById(parts[1]); return c?L(c.title):t("not_found"); }
    if (parts[0]==="blog"&&parts[1]) { const b=BLOG_POSTS.find(x=>x.id===parts[1]); return b?L(b.title):t("blog"); }
    const map = { home:t("home"), paths:t("paths"), exercises:t("exercises"), quiz:t("exercises"), formulas:t("formulas"), calculators:t("calculators"), dashboard:t("dashboard"), account:t("account"), blog:t("blog") };
    return map[parts[0]] || "MatheMeister";
  }
  function updateMeta(parts) {
    let desc = t("hero_sub");
    if (parts[0]==="topic") { const tp=topicById(parts[1]); if (tp) desc = L(tp.simple); }
    if (parts[0]==="category") { const c=catById(parts[1]); if (c) desc = L(c.desc); }
    let m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute("content", desc.slice(0,160));
    document.documentElement.lang = lang();
  }

  /* ---------------- Init ---------------- */
  function init() {
    renderShell();
    wireSearchOverlay();
    SEARCH_INDEX = buildIndex();
    window.addEventListener("hashchange", route);
    if (!location.hash) location.hash = "/home";
    route();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
