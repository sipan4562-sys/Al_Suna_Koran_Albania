/* =============================================================
   MatheMeister – Mehrsprachigkeit (i18n.js)
   Deutsch (Standard), Englisch. Weitere Sprachen leicht ergänzbar.
   ============================================================= */

const I18N = {
  de: {
    "nav.home": "Startseite",
    "nav.learn": "Lernbereiche",
    "nav.exercises": "Übungen",
    "nav.formulas": "Formelsammlung",
    "nav.calculators": "Rechner",
    "nav.paths": "Lernpfade",
    "nav.blog": "Blog",
    "nav.dashboard": "Dashboard",
    "search.placeholder": "Themen, Formeln, Übungen suchen …",
    "search.open": "Suche öffnen",
    "search.empty": "Keine Ergebnisse gefunden.",
    "search.hint": "Tipp: Suche nach „Pythagoras“, „Bruch“ oder „Ableitung“.",
    "theme.toggle": "Design wechseln",
    "hero.badge": "Kostenlos · Werbefrei · Für alle Geräte",
    "hero.title": "Mathematik endlich verstehen",
    "hero.subtitle": "Von den Grundlagen bis zur Hochschulmathematik – mit klaren Erklärungen, Schritt-für-Schritt-Lösungen, interaktiven Übungen und Rechnern.",
    "hero.cta": "Jetzt lernen",
    "hero.cta2": "Übungen entdecken",
    "home.popular": "Beliebte Themen",
    "home.latest": "Neueste Inhalte",
    "home.areas": "Alle Lernbereiche",
    "home.progress": "Dein Lernfortschritt",
    "home.stats.topics": "Themen",
    "home.stats.exercises": "Übungen",
    "home.stats.calculators": "Rechner",
    "home.stats.free": "Kostenlos",
    "lesson.simple": "Einfache Erklärung",
    "lesson.detailed": "Ausführliche Erklärung",
    "lesson.examples": "Beispiele",
    "lesson.steps": "Schritt für Schritt",
    "lesson.formulas": "Wichtige Formeln",
    "lesson.mistakes": "Häufige Fehler",
    "lesson.exercises": "Übungen",
    "lesson.markDone": "Als erledigt markieren",
    "lesson.done": "Erledigt ✓",
    "lesson.favorite": "Zu Favoriten",
    "lesson.favorited": "Favorit ★",
    "quiz.check": "Prüfen",
    "quiz.next": "Nächste",
    "quiz.correct": "Richtig!",
    "quiz.wrong": "Nicht ganz.",
    "quiz.result": "Ergebnis",
    "quiz.restart": "Neu starten",
    "footer.tagline": "Deine kostenlose Plattform für Mathematik – von der Grundschule bis zur Uni.",
    "auth.login": "Anmelden",
    "auth.register": "Registrieren",
    "auth.logout": "Abmelden",
    "level.Anfänger": "Anfänger",
    "level.Fortgeschritten": "Fortgeschritten",
    "level.Experte": "Experte",
    "common.back": "Zurück",
    "common.all": "Alle",
    "common.start": "Starten"
  },
  en: {
    "nav.home": "Home",
    "nav.learn": "Learn",
    "nav.exercises": "Exercises",
    "nav.formulas": "Formulas",
    "nav.calculators": "Calculators",
    "nav.paths": "Learning paths",
    "nav.blog": "Blog",
    "nav.dashboard": "Dashboard",
    "search.placeholder": "Search topics, formulas, exercises …",
    "search.open": "Open search",
    "search.empty": "No results found.",
    "search.hint": "Tip: try “Pythagoras”, “fraction” or “derivative”.",
    "theme.toggle": "Toggle theme",
    "hero.badge": "Free · Ad-free · Every device",
    "hero.title": "Finally understand mathematics",
    "hero.subtitle": "From the basics to university maths – with clear explanations, step-by-step solutions, interactive exercises and calculators.",
    "hero.cta": "Start learning",
    "hero.cta2": "Explore exercises",
    "home.popular": "Popular topics",
    "home.latest": "Latest content",
    "home.areas": "All learning areas",
    "home.progress": "Your progress",
    "home.stats.topics": "Topics",
    "home.stats.exercises": "Exercises",
    "home.stats.calculators": "Calculators",
    "home.stats.free": "Free",
    "lesson.simple": "Simple explanation",
    "lesson.detailed": "Detailed explanation",
    "lesson.examples": "Examples",
    "lesson.steps": "Step by step",
    "lesson.formulas": "Key formulas",
    "lesson.mistakes": "Common mistakes",
    "lesson.exercises": "Exercises",
    "lesson.markDone": "Mark as done",
    "lesson.done": "Done ✓",
    "lesson.favorite": "Add to favorites",
    "lesson.favorited": "Favorite ★",
    "quiz.check": "Check",
    "quiz.next": "Next",
    "quiz.correct": "Correct!",
    "quiz.wrong": "Not quite.",
    "quiz.result": "Result",
    "quiz.restart": "Restart",
    "footer.tagline": "Your free platform for mathematics – from primary school to university.",
    "auth.login": "Sign in",
    "auth.register": "Sign up",
    "auth.logout": "Sign out",
    "level.Anfänger": "Beginner",
    "level.Fortgeschritten": "Intermediate",
    "level.Experte": "Expert",
    "common.back": "Back",
    "common.all": "All",
    "common.start": "Start"
  }
};

const i18n = {
  lang: localStorage.getItem("mm_lang") || "de",
  set(lang) {
    this.lang = lang;
    localStorage.setItem("mm_lang", lang);
    document.documentElement.lang = lang;
    this.apply();
  },
  t(key) {
    return (I18N[this.lang] && I18N[this.lang][key]) || (I18N.de[key]) || key;
  },
  apply() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = this.t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
      el.setAttribute("placeholder", this.t(el.getAttribute("data-i18n-ph")));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => {
      el.setAttribute("aria-label", this.t(el.getAttribute("data-i18n-aria")));
    });
  }
};

if (typeof window !== "undefined") window.i18n = i18n;
