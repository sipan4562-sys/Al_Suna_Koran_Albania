/* =============================================================
   MatheMeister – App-Kern (app.js)
   Hash-Router, Views, Theme, Suche, Fortschritt, Auth, Quiz.
   ============================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     Zustand & Persistenz (localStorage)
  --------------------------------------------------------- */
  const Store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("mm_" + key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, val) { localStorage.setItem("mm_" + key, JSON.stringify(val)); }
  };

  const state = {
    progress: Store.get("progress", {}),      // { topicId: true }
    favorites: Store.get("favorites", {}),    // { topicId: true }
    quizStats: Store.get("quizStats", { answered: 0, correct: 0 }),
    user: Store.get("user", null)             // { name, email }
  };

  function saveProgress() { Store.set("progress", state.progress); }
  function saveFavorites() { Store.set("favorites", state.favorites); }
  function saveQuiz() { Store.set("quizStats", state.quizStats); }

  /* ---------------------------------------------------------
     Hilfsfunktionen
  --------------------------------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const app = $("#app");

  function topicById(id) { return window.ALL_TOPICS.find(t => t.id === id); }
  function categoryById(id) { return window.CONTENT.categories.find(c => c.id === id); }

  const totalTopics = window.ALL_TOPICS.length;
  const totalExercises = window.ALL_TOPICS.reduce((n, t) => n + (t.exercises ? t.exercises.length : 0), 0);

  function progressPercent() {
    const done = Object.keys(state.progress).filter(k => state.progress[k]).length;
    return totalTopics ? Math.round(done / totalTopics * 100) : 0;
  }

  /* ---------------------------------------------------------
     Theme
  --------------------------------------------------------- */
  const Theme = {
    init() {
      const saved = localStorage.getItem("mm_theme");
      const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      this.apply(saved || prefers);
    },
    apply(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("mm_theme", theme);
      const btn = $("#themeToggle");
      if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
    },
    toggle() {
      const cur = document.documentElement.getAttribute("data-theme");
      this.apply(cur === "dark" ? "light" : "dark");
    }
  };

  /* ---------------------------------------------------------
     Suche
  --------------------------------------------------------- */
  const Search = {
    open() {
      $("#searchModal").classList.add("is-open");
      $("#searchModal").setAttribute("aria-hidden", "false");
      const inp = $("#searchInput");
      inp.value = ""; this.results("");
      setTimeout(() => inp.focus(), 50);
    },
    close() {
      $("#searchModal").classList.remove("is-open");
      $("#searchModal").setAttribute("aria-hidden", "true");
    },
    results(q) {
      const list = $("#searchResults");
      q = q.trim().toLowerCase();
      if (!q) {
        list.innerHTML = `<p class="search-hint">${esc(window.i18n.t("search.hint"))}</p>`;
        return;
      }
      const matches = window.ALL_TOPICS.filter(t => {
        const hay = (t.title + " " + t.summary + " " + t.categoryTitle + " " + (t.tags || []).join(" ")).toLowerCase();
        return hay.includes(q);
      }).slice(0, 20);
      if (!matches.length) { list.innerHTML = `<p class="search-hint">${esc(window.i18n.t("search.empty"))}</p>`; return; }
      list.innerHTML = matches.map(t => `
        <a class="search-result" href="#/lernen/${t.categoryId}/${t.id}">
          <span class="search-result__icon">${t.icon}</span>
          <span class="search-result__text">
            <strong>${esc(t.title)}</strong>
            <small>${esc(t.categoryTitle)} · ${esc(t.summary)}</small>
          </span>
        </a>`).join("");
      $$(".search-result", list).forEach(a => a.addEventListener("click", () => Search.close()));
    }
  };

  /* ---------------------------------------------------------
     Komponenten (HTML-Bausteine)
  --------------------------------------------------------- */
  function topicCard(t) {
    const done = state.progress[t.id];
    return `
      <a class="card topic-card" href="#/lernen/${t.categoryId}/${t.id}" style="--accent:${t.categoryColor}">
        <div class="topic-card__icon">${t.icon}</div>
        <div class="topic-card__body">
          <h3>${esc(t.title)} ${done ? '<span class="badge badge--done">✓</span>' : ""}</h3>
          <p>${esc(t.summary)}</p>
          <span class="chip chip--level">${esc(window.i18n.t("level." + t.level))}</span>
        </div>
        <span class="topic-card__arrow" aria-hidden="true">→</span>
      </a>`;
  }

  function categoryCard(c) {
    const count = c.topics.length;
    const done = c.topics.filter(t => state.progress[t.id]).length;
    const pct = count ? Math.round(done / count * 100) : 0;
    return `
      <a class="card category-card" href="#/lernen/${c.id}" style="--accent:${c.color}">
        <div class="category-card__icon">${c.icon}</div>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.description)}</p>
        <div class="category-card__meta">
          <span>${count} Themen</span>
          <div class="mini-progress"><span style="width:${pct}%"></span></div>
        </div>
      </a>`;
  }

  function breadcrumb(items) {
    return `<nav class="breadcrumb" aria-label="Brotkrümel">${items.map((it, i) =>
      i < items.length - 1 && it.href
        ? `<a href="${it.href}">${esc(it.label)}</a><span aria-hidden="true">/</span>`
        : `<span aria-current="page">${esc(it.label)}</span>`
    ).join("")}</nav>`;
  }

  /* ---------------------------------------------------------
     Views
  --------------------------------------------------------- */
  const Views = {
    home() {
      const popular = ["pythagoras", "brueche", "prozentrechnung", "ableitungen", "quadratische-funktionen", "wahrscheinlichkeit"]
        .map(topicById).filter(Boolean);
      const latest = window.ALL_TOPICS.slice(-6).reverse();
      const pct = progressPercent();
      return `
        <section class="hero">
          <div class="hero__content">
            <span class="hero__badge" data-i18n="hero.badge"></span>
            <h1 data-i18n="hero.title"></h1>
            <p class="hero__sub" data-i18n="hero.subtitle"></p>
            <div class="hero__actions">
              <a class="btn btn--primary btn--lg" href="#/lernen" data-i18n="hero.cta"></a>
              <a class="btn btn--ghost btn--lg" href="#/uebungen" data-i18n="hero.cta2"></a>
            </div>
          </div>
          <div class="hero__art" aria-hidden="true">
            <div class="float-formula f1">a² + b² = c²</div>
            <div class="float-formula f2">∫ f(x) dx</div>
            <div class="float-formula f3">π ≈ 3,14159</div>
            <div class="float-formula f4">Δy/Δx</div>
            <div class="hero__blob"></div>
          </div>
        </section>

        <section class="stats-band">
          <div class="stat"><strong>${totalTopics}+</strong><span data-i18n="home.stats.topics"></span></div>
          <div class="stat"><strong>${totalExercises}+</strong><span data-i18n="home.stats.exercises"></span></div>
          <div class="stat"><strong>${window.Calculators.list.length}</strong><span data-i18n="home.stats.calculators"></span></div>
          <div class="stat"><strong>100 %</strong><span data-i18n="home.stats.free"></span></div>
        </section>

        <section class="section">
          <div class="section__head"><h2 data-i18n="home.progress"></h2></div>
          <div class="progress-panel">
            <div class="progress-ring" style="--pct:${pct}">
              <span>${pct}%</span>
            </div>
            <div class="progress-panel__text">
              <p>Du hast <strong>${Object.keys(state.progress).filter(k=>state.progress[k]).length}</strong> von ${totalTopics} Themen abgeschlossen.</p>
              <p class="muted">Quiz-Bilanz: ${state.quizStats.correct} richtige von ${state.quizStats.answered} beantworteten Fragen.</p>
              <a class="btn btn--outline" href="#/dashboard" data-i18n="nav.dashboard"></a>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section__head"><h2 data-i18n="home.popular"></h2><a class="section__link" href="#/lernen" data-i18n="common.all"></a></div>
          <div class="grid grid--cards">${popular.map(topicCard).join("")}</div>
        </section>

        <section class="section">
          <div class="section__head"><h2 data-i18n="home.areas"></h2></div>
          <div class="grid grid--cards">${window.CONTENT.categories.map(categoryCard).join("")}</div>
        </section>

        <section class="section">
          <div class="section__head"><h2 data-i18n="home.latest"></h2></div>
          <div class="grid grid--cards">${latest.map(topicCard).join("")}</div>
        </section>
      `;
    },

    learn() {
      return `
        ${breadcrumb([{ label: "Start", href: "#/" }, { label: window.i18n.t("nav.learn") }])}
        <header class="page-head">
          <h1 data-i18n="home.areas"></h1>
          <p class="muted">Wähle einen Bereich und tauche in die Themen ein.</p>
        </header>
        <div class="grid grid--cards">${window.CONTENT.categories.map(categoryCard).join("")}</div>
      `;
    },

    category(catId) {
      const c = categoryById(catId);
      if (!c) return this.notFound();
      return `
        ${breadcrumb([{ label: "Start", href: "#/" }, { label: window.i18n.t("nav.learn"), href: "#/lernen" }, { label: c.title }])}
        <header class="page-head" style="--accent:${c.color}">
          <div class="page-head__icon">${c.icon}</div>
          <div><h1>${esc(c.title)}</h1><p class="muted">${esc(c.description)}</p></div>
        </header>
        <div class="grid grid--cards">${c.topics.map(t => topicCard({ ...t, categoryId: c.id, categoryColor: c.color, categoryTitle: c.title })).join("")}</div>
      `;
    },

    lesson(catId, topicId) {
      const c = categoryById(catId);
      const t = topicById(topicId);
      if (!c || !t) return this.notFound();
      const done = state.progress[t.id];
      const fav = state.favorites[t.id];
      const idx = c.topics.findIndex(x => x.id === topicId);
      const prev = c.topics[idx - 1], next = c.topics[idx + 1];

      const section = (title, icon, body) => `
        <section class="lesson-section">
          <h2><span class="lesson-section__icon">${icon}</span> ${esc(title)}</h2>
          ${body}
        </section>`;

      const examples = (t.examples || []).map((e, i) => `
        <details class="example"${i === 0 ? " open" : ""}>
          <summary>${esc(e.q)}</summary>
          <div class="example__answer">${esc(e.a)}</div>
        </details>`).join("");

      const steps = (t.steps || []).map((s, i) => `
        <li class="step-item"><span class="step-item__num">${i + 1}</span><span>${esc(s)}</span></li>`).join("");

      const formulas = (t.formulas || []).map(f => `
        <div class="formula-card"><span class="formula-card__name">${esc(f.name)}</span><code>${esc(f.tex)}</code></div>`).join("");

      const mistakes = (t.mistakes || []).map(m => `<li>${esc(m)}</li>`).join("");

      return `
        ${breadcrumb([{ label: "Start", href: "#/" }, { label: c.title, href: "#/lernen/" + c.id }, { label: t.title }])}
        <article class="lesson">
          <header class="lesson__head" style="--accent:${c.color}">
            <div class="lesson__icon">${t.icon}</div>
            <div class="lesson__title">
              <span class="chip chip--level">${esc(window.i18n.t("level." + t.level))}</span>
              <h1>${esc(t.title)}</h1>
              <p class="muted">${esc(t.summary)}</p>
            </div>
            <div class="lesson__actions">
              <button class="btn btn--sm ${done ? "btn--success" : "btn--outline"}" id="btnDone">
                ${done ? window.i18n.t("lesson.done") : window.i18n.t("lesson.markDone")}
              </button>
              <button class="btn btn--sm ${fav ? "btn--gold" : "btn--outline"}" id="btnFav">
                ${fav ? window.i18n.t("lesson.favorited") : window.i18n.t("lesson.favorite")}
              </button>
            </div>
          </header>

          ${section(window.i18n.t("lesson.simple"), "💡", t.simple || "")}
          ${section(window.i18n.t("lesson.detailed"), "📖", t.detailed || "")}
          ${t.formulas && t.formulas.length ? section(window.i18n.t("lesson.formulas"), "📐", `<div class="formula-grid">${formulas}</div>`) : ""}
          ${t.examples && t.examples.length ? section(window.i18n.t("lesson.examples"), "🧩", examples) : ""}
          ${t.steps && t.steps.length ? section(window.i18n.t("lesson.steps"), "🪜", `<ol class="step-list">${steps}</ol>`) : ""}
          ${t.mistakes && t.mistakes.length ? section(window.i18n.t("lesson.mistakes"), "⚠️", `<ul class="mistake-list">${mistakes}</ul>`) : ""}
          ${t.exercises && t.exercises.length ? `
            <section class="lesson-section">
              <h2><span class="lesson-section__icon">✏️</span> ${esc(window.i18n.t("lesson.exercises"))}</h2>
              <div id="quizMount"></div>
            </section>` : ""}

          <nav class="lesson-nav">
            ${prev ? `<a class="lesson-nav__btn" href="#/lernen/${c.id}/${prev.id}">← ${esc(prev.title)}</a>` : "<span></span>"}
            ${next ? `<a class="lesson-nav__btn lesson-nav__btn--next" href="#/lernen/${c.id}/${next.id}">${esc(next.title)} →</a>` : "<span></span>"}
          </nav>
        </article>
      `;
    },

    exercises() {
      const cats = window.CONTENT.categories;
      return `
        ${breadcrumb([{ label: "Start", href: "#/" }, { label: window.i18n.t("nav.exercises") }])}
        <header class="page-head">
          <h1 data-i18n="nav.exercises"></h1>
          <p class="muted">${totalExercises} interaktive Aufgaben mit sofortiger Auswertung und Lösungsweg.</p>
        </header>
        <div class="quiz-launcher card">
          <h2>Gemischtes Quiz</h2>
          <p class="muted">10 zufällige Fragen aus allen Bereichen.</p>
          <button class="btn btn--primary" id="startMixed" data-i18n="common.start"></button>
          <div id="mixedQuiz"></div>
        </div>
        <h2 class="section__head">Nach Bereich üben</h2>
        <div class="grid grid--cards">
          ${cats.map(c => `
            <div class="card category-card" style="--accent:${c.color}">
              <div class="category-card__icon">${c.icon}</div>
              <h3>${esc(c.title)}</h3>
              <p>${c.topics.reduce((n,t)=>n+(t.exercises?t.exercises.length:0),0)} Aufgaben</p>
              <a class="btn btn--outline" href="#/lernen/${c.id}">Zu den Themen</a>
            </div>`).join("")}
        </div>
      `;
    },

    formulas() {
      const rows = window.ALL_TOPICS.flatMap(t => (t.formulas || []).map(f => ({ ...f, topic: t.title, cat: t.categoryTitle, catId: t.categoryId, topicId: t.id })));
      return `
        ${breadcrumb([{ label: "Start", href: "#/" }, { label: window.i18n.t("nav.formulas") }])}
        <header class="page-head">
          <h1 data-i18n="nav.formulas"></h1>
          <p class="muted">Alle wichtigen Formeln – nach Themen sortiert und durchsuchbar.</p>
        </header>
        <input type="search" id="formulaFilter" class="input-search" placeholder="Formel oder Thema filtern …">
        <div class="formula-table" id="formulaTable">
          ${rows.map(f => `
            <a class="formula-row" href="#/lernen/${f.catId}/${f.topicId}" data-search="${esc((f.name + " " + f.tex + " " + f.topic + " " + f.cat).toLowerCase())}">
              <span class="formula-row__name">${esc(f.name)}</span>
              <code class="formula-row__tex">${esc(f.tex)}</code>
              <span class="formula-row__topic">${esc(f.topic)}</span>
            </a>`).join("")}
        </div>
      `;
    },

    calculators() {
      return `
        ${breadcrumb([{ label: "Start", href: "#/" }, { label: window.i18n.t("nav.calculators") }])}
        <header class="page-head">
          <h1 data-i18n="nav.calculators"></h1>
          <p class="muted">Praktische Rechner für schnelle Ergebnisse.</p>
        </header>
        <div class="grid grid--cards">
          ${window.Calculators.list.map(c => `
            <a class="card calc-card" href="#/rechner/${c.id}">
              <div class="calc-card__icon">${c.icon}</div>
              <h3>${esc(c.title)}</h3>
              <p>${esc(c.desc)}</p>
            </a>`).join("")}
        </div>
      `;
    },

    calculator(id) {
      const meta = window.Calculators.list.find(c => c.id === id);
      if (!meta) return this.notFound();
      return `
        ${breadcrumb([{ label: "Start", href: "#/" }, { label: window.i18n.t("nav.calculators"), href: "#/rechner" }, { label: meta.title }])}
        <header class="page-head"><div class="page-head__icon">${meta.icon}</div><div><h1>${esc(meta.title)}</h1><p class="muted">${esc(meta.desc)}</p></div></header>
        <div id="calcMount" class="calc-mount"></div>
      `;
    },

    paths() {
      const paths = [
        { id: "anfaenger", title: "Anfänger", icon: "🌱", color: "#22c55e", desc: "Grundlagen sicher aufbauen.", level: "Anfänger" },
        { id: "fortgeschritten", title: "Fortgeschrittene", icon: "🚀", color: "#6366f1", desc: "Algebra, Geometrie und Trigonometrie vertiefen.", level: "Fortgeschritten" },
        { id: "experten", title: "Experten", icon: "🏆", color: "#f59e0b", desc: "Analysis, Hochschulmathematik und Prüfungsstoff.", level: "Experte" }
      ];
      return `
        ${breadcrumb([{ label: "Start", href: "#/" }, { label: window.i18n.t("nav.paths") }])}
        <header class="page-head"><h1 data-i18n="nav.paths"></h1><p class="muted">Strukturierte Lernwege vom Einstieg bis zur Meisterschaft.</p></header>
        <div class="path-track">
          ${paths.map((p, i) => {
            const topics = window.ALL_TOPICS.filter(t => t.level === p.level);
            const done = topics.filter(t => state.progress[t.id]).length;
            const pct = topics.length ? Math.round(done / topics.length * 100) : 0;
            return `
              <div class="path-node card" style="--accent:${p.color}">
                <div class="path-node__badge">${i + 1}</div>
                <div class="path-node__icon">${p.icon}</div>
                <h3>${esc(p.title)}</h3>
                <p>${esc(p.desc)}</p>
                <div class="mini-progress"><span style="width:${pct}%"></span></div>
                <small class="muted">${done}/${topics.length} Themen · ${pct}%</small>
                <div class="path-node__topics">
                  ${topics.slice(0, 6).map(t => `<a href="#/lernen/${t.categoryId}/${t.id}" class="chip">${esc(t.title)}</a>`).join("")}
                </div>
              </div>`;
          }).join("")}
        </div>
      `;
    },

    blog() {
      const posts = window.BLOG_POSTS || [];
      return `
        ${breadcrumb([{ label: "Start", href: "#/" }, { label: window.i18n.t("nav.blog") }])}
        <header class="page-head"><h1 data-i18n="nav.blog"></h1><p class="muted">Erklärungen, Lernstrategien sowie Tipps und Tricks.</p></header>
        <div class="grid grid--cards">
          ${posts.map(p => `
            <a class="card blog-card" href="#/blog/${p.id}">
              <div class="blog-card__tag">${esc(p.tag)}</div>
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.excerpt)}</p>
              <small class="muted">${esc(p.date)} · ${esc(p.read)}</small>
            </a>`).join("")}
        </div>
      `;
    },

    blogPost(id) {
      const p = (window.BLOG_POSTS || []).find(x => x.id === id);
      if (!p) return this.notFound();
      return `
        ${breadcrumb([{ label: "Start", href: "#/" }, { label: window.i18n.t("nav.blog"), href: "#/blog" }, { label: p.title }])}
        <article class="blog-post">
          <span class="blog-card__tag">${esc(p.tag)}</span>
          <h1>${esc(p.title)}</h1>
          <p class="muted">${esc(p.date)} · ${esc(p.read)}</p>
          <div class="blog-post__body">${p.body}</div>
        </article>
      `;
    },

    dashboard() {
      const doneTopics = window.ALL_TOPICS.filter(t => state.progress[t.id]);
      const favTopics = window.ALL_TOPICS.filter(t => state.favorites[t.id]);
      const pct = progressPercent();
      const acc = state.quizStats.answered ? Math.round(state.quizStats.correct / state.quizStats.answered * 100) : 0;
      return `
        ${breadcrumb([{ label: "Start", href: "#/" }, { label: window.i18n.t("nav.dashboard") }])}
        <header class="page-head">
          <div><h1 data-i18n="nav.dashboard"></h1><p class="muted">${state.user ? "Willkommen zurück, " + esc(state.user.name) + "!" : "Dein Lernüberblick (lokal gespeichert)."}</p></div>
          ${state.user ? `<button class="btn btn--outline btn--sm" id="logoutBtn" data-i18n="auth.logout"></button>` : `<a class="btn btn--primary btn--sm" href="#/login" data-i18n="auth.login"></a>`}
        </header>

        <div class="dash-grid">
          <div class="dash-stat card"><div class="progress-ring" style="--pct:${pct}"><span>${pct}%</span></div><p>Gesamtfortschritt</p></div>
          <div class="dash-stat card"><strong class="dash-num">${doneTopics.length}</strong><p>Abgeschlossene Themen</p></div>
          <div class="dash-stat card"><strong class="dash-num">${favTopics.length}</strong><p>Favoriten</p></div>
          <div class="dash-stat card"><strong class="dash-num">${acc}%</strong><p>Quiz-Trefferquote</p></div>
        </div>

        <section class="section">
          <div class="section__head"><h2>${esc(window.i18n.t("lesson.favorited"))}</h2></div>
          ${favTopics.length ? `<div class="grid grid--cards">${favTopics.map(topicCard).join("")}</div>` : `<p class="muted">Noch keine Favoriten – markiere Themen mit dem Stern.</p>`}
        </section>

        <section class="section">
          <div class="section__head"><h2>Abgeschlossen</h2></div>
          ${doneTopics.length ? `<div class="grid grid--cards">${doneTopics.map(topicCard).join("")}</div>` : `<p class="muted">Schließe dein erstes Thema ab, um es hier zu sehen.</p>`}
        </section>
      `;
    },

    auth(mode) {
      const isLogin = mode === "login";
      return `
        ${breadcrumb([{ label: "Start", href: "#/" }, { label: isLogin ? window.i18n.t("auth.login") : window.i18n.t("auth.register") }])}
        <div class="auth-card card">
          <h1>${esc(isLogin ? window.i18n.t("auth.login") : window.i18n.t("auth.register"))}</h1>
          <p class="muted">Demo-Konto – Daten werden nur lokal in deinem Browser gespeichert.</p>
          <form id="authForm" class="auth-form">
            ${isLogin ? "" : `<label>Name<input type="text" id="authName" required placeholder="Dein Name"></label>`}
            <label>E-Mail<input type="email" id="authEmail" required placeholder="du@beispiel.de"></label>
            <label>Passwort<input type="password" id="authPass" required minlength="4" placeholder="••••••"></label>
            <button class="btn btn--primary" type="submit">${esc(isLogin ? window.i18n.t("auth.login") : window.i18n.t("auth.register"))}</button>
          </form>
          <p class="auth-switch">
            ${isLogin ? `Noch kein Konto? <a href="#/registrieren">${esc(window.i18n.t("auth.register"))}</a>` : `Schon ein Konto? <a href="#/login">${esc(window.i18n.t("auth.login"))}</a>`}
          </p>
        </div>
      `;
    },

    notFound() {
      return `
        <div class="notfound">
          <div class="notfound__icon">🧭</div>
          <h1>404 – Seite nicht gefunden</h1>
          <p class="muted">Diese Seite gibt es nicht (mehr). Zurück zur Startseite?</p>
          <a class="btn btn--primary" href="#/">Zur Startseite</a>
        </div>
      `;
    }
  };

  /* ---------------------------------------------------------
     Quiz-Engine
  --------------------------------------------------------- */
  const Quiz = {
    mount(el, questions) {
      if (!el || !questions.length) return;
      let i = 0, score = 0, answered = false;
      const render = () => {
        const q = questions[i];
        el.innerHTML = `
          <div class="quiz">
            <div class="quiz__progress"><span style="width:${(i) / questions.length * 100}%"></span></div>
            <div class="quiz__meta">Frage ${i + 1} / ${questions.length}</div>
            <p class="quiz__q">${esc(q.q)}</p>
            <div class="quiz__choices">
              ${q.choices.map((c, ci) => `<button class="quiz__choice" data-ci="${ci}">${esc(c)}</button>`).join("")}
            </div>
            <div class="quiz__feedback" aria-live="polite"></div>
            <div class="quiz__actions"><button class="btn btn--primary" id="quizNext" disabled data-i18n="quiz.next"></button></div>
          </div>`;
        const fb = $(".quiz__feedback", el);
        const nextBtn = $("#quizNext", el);
        nextBtn.textContent = window.i18n.t(i === questions.length - 1 ? "quiz.result" : "quiz.next");
        $$(".quiz__choice", el).forEach(btn => {
          btn.addEventListener("click", () => {
            if (answered) return;
            answered = true;
            const ci = parseInt(btn.dataset.ci);
            const correct = ci === q.answer;
            state.quizStats.answered++;
            if (correct) { state.quizStats.correct++; score++; }
            saveQuiz();
            $$(".quiz__choice", el).forEach((b, bi) => {
              b.disabled = true;
              if (bi === q.answer) b.classList.add("is-correct");
              else if (bi === ci) b.classList.add("is-wrong");
            });
            fb.innerHTML = `<div class="quiz__result ${correct ? "ok" : "no"}">
              <strong>${correct ? window.i18n.t("quiz.correct") : window.i18n.t("quiz.wrong")}</strong>
              <span>${esc(q.solution)}</span></div>`;
            nextBtn.disabled = false;
          });
        });
        nextBtn.addEventListener("click", () => {
          if (i === questions.length - 1) { showResult(); }
          else { i++; answered = false; render(); }
        });
      };
      const showResult = () => {
        const pct = Math.round(score / questions.length * 100);
        el.innerHTML = `
          <div class="quiz quiz--result">
            <div class="progress-ring" style="--pct:${pct}"><span>${pct}%</span></div>
            <h3>${score} / ${questions.length} richtig</h3>
            <p class="muted">${pct >= 80 ? "Ausgezeichnet! 🎉" : pct >= 50 ? "Gut gemacht – weiter so!" : "Übung macht den Meister. Versuch es noch einmal!"}</p>
            <button class="btn btn--primary" id="quizRestart" data-i18n="quiz.restart"></button>
          </div>`;
        $("#quizRestart", el).textContent = window.i18n.t("quiz.restart");
        $("#quizRestart", el).addEventListener("click", () => { i = 0; score = 0; answered = false; render(); refreshBadges(); });
        refreshBadges();
      };
      render();
    }
  };

  /* ---------------------------------------------------------
     Router
  --------------------------------------------------------- */
  function parseHash() {
    const h = (location.hash || "#/").replace(/^#/, "");
    return h.split("/").filter(Boolean); // ["lernen","algebra","gleichungen"]
  }

  function render() {
    const parts = parseHash();
    let html, afterMount = null;
    const root = parts[0] || "";

    if (!root) html = Views.home();
    else if (root === "lernen") {
      if (parts[2]) { html = Views.lesson(parts[1], parts[2]); afterMount = () => bindLesson(parts[1], parts[2]); }
      else if (parts[1]) html = Views.category(parts[1]);
      else html = Views.learn();
    }
    else if (root === "uebungen") { html = Views.exercises(); afterMount = bindExercises; }
    else if (root === "formeln") { html = Views.formulas(); afterMount = bindFormulas; }
    else if (root === "rechner") {
      if (parts[1]) { html = Views.calculator(parts[1]); afterMount = () => window.Calculators.render(parts[1], $("#calcMount")); }
      else html = Views.calculators();
    }
    else if (root === "lernpfade") html = Views.paths();
    else if (root === "blog") { html = parts[1] ? Views.blogPost(parts[1]) : Views.blog(); }
    else if (root === "dashboard") { html = Views.dashboard(); afterMount = bindDashboard; }
    else if (root === "login") { html = Views.auth("login"); afterMount = () => bindAuth("login"); }
    else if (root === "registrieren") { html = Views.auth("register"); afterMount = () => bindAuth("register"); }
    else html = Views.notFound();

    app.innerHTML = html;
    window.i18n.apply();
    setActiveNav(root);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    if (afterMount) afterMount();
    // Einblend-Animation
    requestAnimationFrame(() => app.classList.add("is-in"));
    observeReveal();
    closeMobileNav();
    document.title = pageTitle(parts);
  }

  function pageTitle(parts) {
    const base = "MatheMeister";
    if (parts[0] === "lernen" && parts[2]) { const t = topicById(parts[2]); return t ? `${t.title} · ${base}` : base; }
    if (parts[0] === "lernen" && parts[1]) { const c = categoryById(parts[1]); return c ? `${c.title} · ${base}` : base; }
    const map = { "": "Mathematik verstehen", lernen: "Lernbereiche", uebungen: "Übungen", formeln: "Formelsammlung", rechner: "Rechner", lernpfade: "Lernpfade", blog: "Blog", dashboard: "Dashboard" };
    return (map[parts[0] || ""] ? map[parts[0] || ""] + " · " : "") + base;
  }

  /* ---------------------------------------------------------
     Nachbindungen (Event-Handler nach Render)
  --------------------------------------------------------- */
  function bindLesson(catId, topicId) {
    const t = topicById(topicId);
    const doneBtn = $("#btnDone"), favBtn = $("#btnFav");
    if (doneBtn) doneBtn.addEventListener("click", () => {
      state.progress[topicId] = !state.progress[topicId];
      saveProgress(); render();
    });
    if (favBtn) favBtn.addEventListener("click", () => {
      state.favorites[topicId] = !state.favorites[topicId];
      saveFavorites(); render();
    });
    const qm = $("#quizMount");
    if (qm && t.exercises) Quiz.mount(qm, t.exercises);
  }

  function bindExercises() {
    const start = $("#startMixed");
    if (start) start.addEventListener("click", () => {
      const pool = window.ALL_TOPICS.flatMap(t => t.exercises || []);
      const shuffled = pool.slice().sort(() => Math.random() - 0.5).slice(0, 10);
      Quiz.mount($("#mixedQuiz"), shuffled);
      $("#mixedQuiz").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function bindFormulas() {
    const filter = $("#formulaFilter");
    if (!filter) return;
    filter.addEventListener("input", () => {
      const q = filter.value.trim().toLowerCase();
      $$(".formula-row").forEach(row => {
        row.style.display = row.dataset.search.includes(q) ? "" : "none";
      });
    });
  }

  function bindDashboard() {
    const logout = $("#logoutBtn");
    if (logout) logout.addEventListener("click", () => { state.user = null; Store.set("user", null); render(); updateAuthUI(); });
  }

  function bindAuth(mode) {
    const form = $("#authForm");
    if (!form) return;
    form.addEventListener("submit", e => {
      e.preventDefault();
      const email = $("#authEmail").value.trim();
      const name = mode === "register" ? $("#authName").value.trim() : email.split("@")[0];
      state.user = { name, email };
      Store.set("user", state.user);
      updateAuthUI();
      location.hash = "#/dashboard";
    });
  }

  /* ---------------------------------------------------------
     Navigation & UI-Chrome
  --------------------------------------------------------- */
  function setActiveNav(root) {
    $$(".nav-link").forEach(a => {
      const target = a.getAttribute("data-root");
      a.classList.toggle("is-active", target === root || (root === "" && target === "home"));
    });
  }

  function updateAuthUI() {
    const el = $("#authArea");
    if (!el) return;
    if (state.user) {
      el.innerHTML = `<a class="nav-avatar" href="#/dashboard" title="${esc(state.user.name)}">${esc(state.user.name.charAt(0).toUpperCase())}</a>`;
    } else {
      el.innerHTML = `<a class="btn btn--outline btn--sm" href="#/login" data-i18n="auth.login"></a>`;
      window.i18n.apply();
    }
  }

  function refreshBadges() {
    const el = $("#progressBadge");
    if (el) el.textContent = progressPercent() + "%";
  }

  function closeMobileNav() {
    $("#mainNav").classList.remove("is-open");
    $("#navToggle").setAttribute("aria-expanded", "false");
  }

  /* ---------------------------------------------------------
     Scroll-Reveal-Animation
  --------------------------------------------------------- */
  let revealObserver;
  function observeReveal() {
    if (!("IntersectionObserver" in window)) return;
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("revealed"); revealObserver.unobserve(e.target); } });
      }, { threshold: 0.08 });
    }
    $$(".section, .card, .lesson-section").forEach(el => {
      if (!el.classList.contains("revealed")) { el.classList.add("reveal"); revealObserver.observe(el); }
    });
  }

  /* ---------------------------------------------------------
     Globale Event-Bindungen
  --------------------------------------------------------- */
  function bindChrome() {
    $("#themeToggle").addEventListener("click", () => Theme.toggle());
    $("#searchBtn").addEventListener("click", () => Search.open());
    $("#searchClose").addEventListener("click", () => Search.close());
    $("#searchModal").addEventListener("click", e => { if (e.target.id === "searchModal") Search.close(); });
    $("#searchInput").addEventListener("input", e => Search.results(e.target.value));

    $("#navToggle").addEventListener("click", () => {
      const nav = $("#mainNav");
      const open = nav.classList.toggle("is-open");
      $("#navToggle").setAttribute("aria-expanded", String(open));
    });

    const langSel = $("#langSelect");
    langSel.value = window.i18n.lang;
    langSel.addEventListener("change", e => { window.i18n.set(e.target.value); render(); });

    // Tastatur: "/" öffnet Suche, ESC schließt
    document.addEventListener("keydown", e => {
      if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) {
        e.preventDefault(); Search.open();
      }
      if (e.key === "Escape") Search.close();
    });
  }

  /* ---------------------------------------------------------
     Init
  --------------------------------------------------------- */
  function init() {
    Theme.init();
    window.i18n.set(window.i18n.lang);
    bindChrome();
    updateAuthUI();
    refreshBadges();
    window.addEventListener("hashchange", render);
    render();
    // Ladebildschirm ausblenden
    const pre = $("#preloader");
    if (pre) setTimeout(() => pre.classList.add("is-hidden"), 300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
