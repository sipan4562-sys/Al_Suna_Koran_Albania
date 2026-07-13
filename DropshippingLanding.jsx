import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Crown,
  Flame,
  Gem,
  Globe,
  Layers,
  LineChart,
  Lock,
  Mail,
  Megaphone,
  MessageSquare,
  PackageCheck,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  Timer,
  TrendingUp,
  Truck,
  Users,
  X,
  Zap,
} from "lucide-react";

/* ============================================================
   NEXGEN COMMERCE — Premium Dropshipping Coaching Landing Page
   Single-file React component · Tailwind CSS · Framer Motion
   ============================================================ */

const EASE = [0.22, 1, 0.36, 1];

/* ------------------------------------------------------------
   Scroll-Reveal Wrapper
   ------------------------------------------------------------ */
function Reveal({ children, delay = 0, y = 32, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------
   3D Tilt Card (Hover-Tilt + Glare) — für Pricing & Panels
   ------------------------------------------------------------ */
function TiltCard({ children, className = "", max = 16, glare = true }) {
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), {
    stiffness: 180,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), {
    stiffness: 180,
    damping: 18,
  });

  const glareX = useTransform(px, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(py, [0, 1], ["0%", "100%"]);
  const glareBg = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, rgba(52,211,153,0.14), transparent 65%)`;

  const onMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <div className="[perspective:1400px]">
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.02 }}
        transition={{ scale: { duration: 0.3, ease: EASE } }}
        className={`relative ${className}`}
      >
        {children}
        {glare && (
          <motion.div
            aria-hidden
            style={{ background: glareBg }}
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
          />
        )}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------
   Hintergrund-Dekoration (Grid + Neon-Orbs)
   ------------------------------------------------------------ */
function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      {/* Feines Raster */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,211,153,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.09) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />
      {/* Neon-Orbs */}
      <motion.div
        className="absolute -top-40 left-1/2 h-[560px] w-[860px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: "rgba(16,185,129,0.13)" }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-200px] top-[38%] h-[460px] w-[460px] rounded-full blur-[130px]"
        style={{ background: "rgba(45,212,191,0.09)" }}
        animate={{ y: [0, 50, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-160px] left-[-160px] h-[460px] w-[460px] rounded-full blur-[130px]"
        style={{ background: "rgba(52,211,153,0.08)" }}
        animate={{ y: [0, -40, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------
   Navbar
   ------------------------------------------------------------ */
function Navbar() {
  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: EASE }}
      className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.06] bg-zinc-950/60 backdrop-blur-xl"
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_0_24px_-4px_rgba(52,211,153,0.7)]">
            <Rocket className="h-[18px] w-[18px] text-zinc-950" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold tracking-[0.22em] text-white">
            NEXGEN<span className="text-emerald-400">·</span>COMMERCE
          </span>
        </a>
        <div className="hidden items-center gap-8 text-sm font-medium text-zinc-400 md:flex">
          <a href="#system" className="transition hover:text-emerald-300">Das System</a>
          <a href="#vergleich" className="transition hover:text-emerald-300">Alt vs. Neu</a>
          <a href="#pricing" className="transition hover:text-emerald-300">Programme</a>
        </div>
        <a
          href="#pricing"
          className="group flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-400/20"
        >
          Warteliste
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </a>
      </nav>
    </motion.header>
  );
}

/* ------------------------------------------------------------
   HERO — 3D Supply-Chain-Karte, die der Maus folgt
   ------------------------------------------------------------ */
const CHAIN_NODES = [
  { icon: Store, label: "Shop", status: "Live · 3 Nischen", color: "text-emerald-300" },
  { icon: Megaphone, label: "Paid Ads", status: "ROAS 4.2x", color: "text-teal-300" },
  { icon: Truck, label: "Fulfillment", status: "100% automatisiert", color: "text-emerald-300" },
  { icon: TrendingUp, label: "Profit", status: "+2.847 € heute", color: "text-emerald-400" },
];

function HeroVisual({ mx, my }) {
  const rotateX = useSpring(useTransform(my, [0, 1], [14, -14]), {
    stiffness: 120,
    damping: 16,
  });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-20, 20]), {
    stiffness: 120,
    damping: 16,
  });

  return (
    <div className="[perspective:1600px]">
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.12}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={{ y: [0, -14, 0] }}
        transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
        className="relative mx-auto w-full max-w-md cursor-grab active:cursor-grabbing"
      >
        {/* Glow hinter der Karte */}
        <div
          aria-hidden
          className="absolute -inset-6 rounded-[2rem] bg-emerald-400/20 blur-3xl"
          style={{ transform: "translateZ(-60px)" }}
        />

        {/* Hauptkarte */}
        <div
          className="relative rounded-3xl border border-white/10 bg-zinc-900/70 p-6 shadow-[0_40px_80px_-24px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="mb-5 flex items-center justify-between" style={{ transform: "translateZ(40px)" }}>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-300">
                Live Supply Chain
              </span>
            </div>
            <Cpu className="h-4 w-4 text-zinc-500" />
          </div>

          {/* Kette */}
          <div className="space-y-3" style={{ transform: "translateZ(30px)" }}>
            {CHAIN_NODES.map((node, i) => (
              <div key={node.label}>
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.18, duration: 0.6, ease: EASE }}
                  className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-3"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
                    <node.icon className={`h-5 w-5 ${node.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{node.label}</p>
                    <p className="truncate text-xs text-zinc-400">{node.status}</p>
                  </div>
                  <div className="ml-auto">
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                    >
                      <Zap className="h-4 w-4 text-emerald-400/70" />
                    </motion.div>
                  </div>
                </motion.div>
                {/* Verbindungs-Puls */}
                {i < CHAIN_NODES.length - 1 && (
                  <div className="relative mx-auto h-3 w-px bg-emerald-400/20">
                    <motion.span
                      className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]"
                      animate={{ top: ["-10%", "100%"], opacity: [0, 1, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.45, ease: "easeIn" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Schwebende Chips (Tiefenebene) */}
        <motion.div
          className="absolute -right-8 -top-6 rounded-2xl border border-emerald-400/30 bg-zinc-900/90 px-4 py-2.5 shadow-[0_0_40px_-8px_rgba(52,211,153,0.5)] backdrop-blur-xl"
          style={{ transform: "translateZ(90px)" }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Marge</p>
              <p className="text-sm font-bold text-emerald-300">38,4 %</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="absolute -bottom-7 -left-8 rounded-2xl border border-white/10 bg-zinc-900/90 px-4 py-2.5 shadow-2xl backdrop-blur-xl"
          style={{ transform: "translateZ(70px)" }}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-teal-300" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Orders heute</p>
              <p className="text-sm font-bold text-white">127 · auto-fulfilled</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function Hero() {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <section
      id="top"
      onMouseMove={onMove}
      onMouseLeave={() => {
        mx.set(0.5);
        my.set(0.5);
      }}
      className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-16 px-5 pb-24 pt-36 sm:px-8 lg:grid-cols-2 lg:gap-10"
    >
      <div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300"
        >
          <Sparkles className="h-3.5 w-3.5" />
          E-Commerce · Generation 2026
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
          className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
        >
          Klassisches Dropshipping{" "}
          <span className="relative whitespace-nowrap">
            ist tot.
            <motion.span
              aria-hidden
              className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-gradient-to-r from-red-500/80 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1, duration: 0.8, ease: EASE }}
            />
          </span>
          <br />
          <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Next-Gen-Systeme übernehmen.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400"
        >
          10-€-Gadgets von AliExpress mit 14 Tagen Lieferzeit skalieren nicht mehr.
          Die neue Generation baut auf{" "}
          <span className="font-semibold text-emerald-300">High-Ticket-Produkte</span>,{" "}
          <span className="font-semibold text-emerald-300">Private Labeling</span> und
          vollautomatisierte Supply Chains — Marken statt Wegwerf-Shops.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <a
            href="#pricing"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-7 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_40px_-8px_rgba(52,211,153,0.8)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <span className="relative z-10">Jetzt Zugang sichern</span>
            <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
            <motion.span
              aria-hidden
              className="absolute inset-0 bg-white/30"
              initial={{ x: "-120%" }}
              animate={{ x: "220%" }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
              style={{ skewX: "-20deg", width: "40%" }}
            />
          </a>
          <a
            href="#system"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:border-emerald-400/40 hover:text-emerald-300"
          >
            Das System verstehen
            <ChevronRight className="h-4 w-4" />
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 1 }}
          className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-white/[0.07] pt-8"
        >
          {[
            { value: "38 %", label: "Ø Netto-Marge" },
            { value: "5–8 T.", label: "Lieferzeit EU" },
            { value: "100 %", label: "Auto-Fulfillment" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-extrabold tracking-tight text-white">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3, ease: EASE }}
      >
        <HeroVisual mx={mx} my={my} />
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------
   Vergleich: Traditionell vs. Next-Gen
   ------------------------------------------------------------ */
const OLD_MODEL = [
  "AliExpress-Massenware ohne Marge",
  "14–30 Tage Lieferzeit → Chargebacks",
  "Gesättigte 10-€-Produkte, Null Differenzierung",
  "Kein Branding, kein Wiederkaufswert",
];

const NEW_MODEL = [
  "High-Ticket & Private Label mit 25–40 % Marge",
  "EU-Fulfillment in 5–8 Tagen, voll automatisiert",
  "Validierte Nischen mit Daten statt Bauchgefühl",
  "Marke + E-Mail-Flows → echter Customer-LTV",
];

function Comparison() {
  return (
    <section id="vergleich" className="relative z-10 mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">Der Paradigmenwechsel</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Warum das alte Modell stirbt — und was es ersetzt
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <Reveal delay={0.1}>
          <TiltCard max={8} className="h-full rounded-3xl border border-white/[0.07] bg-zinc-900/50 p-8 backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3" style={{ transform: "translateZ(30px)" }}>
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Traditionelles Dropshipping</h3>
                <p className="text-xs uppercase tracking-widest text-red-400/80">Auslaufmodell · 2016–2023</p>
              </div>
            </div>
            <ul className="space-y-4" style={{ transform: "translateZ(20px)" }}>
              {OLD_MODEL.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-400">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500/70" />
                  {item}
                </li>
              ))}
            </ul>
          </TiltCard>
        </Reveal>

        <Reveal delay={0.2}>
          <TiltCard
            max={8}
            className="h-full rounded-3xl border border-emerald-400/25 bg-gradient-to-b from-emerald-400/[0.08] to-zinc-900/50 p-8 shadow-[0_0_60px_-16px_rgba(52,211,153,0.35)] backdrop-blur-xl"
          >
            <div className="mb-6 flex items-center gap-3" style={{ transform: "translateZ(30px)" }}>
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/15">
                <Rocket className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Next-Gen E-Commerce</h3>
                <p className="text-xs uppercase tracking-widest text-emerald-400">Das neue Betriebssystem</p>
              </div>
            </div>
            <ul className="space-y-4" style={{ transform: "translateZ(20px)" }}>
              {NEW_MODEL.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------
   3D INTERAKTIVER EXPLAINER — 4 Schritte mit Flip-Karte
   ------------------------------------------------------------ */
const STEPS = [
  {
    id: 1,
    icon: Store,
    title: "Shop-Erstellung",
    kicker: "Phase 01 · Fundament",
    headline: "Conversion-Maschine statt Baukasten-Shop.",
    summary: "Nischen-Validierung & Store-Setup",
    details: [
      {
        icon: Target,
        label: "Datengetriebene Nischen-Validierung",
        text: "Produktauswahl über Suchvolumen-Trends, Margen-Kalkulation und Wettbewerbs-Scoring — bevor der erste Euro in Ads fließt.",
      },
      {
        icon: Layers,
        label: "CRO-Architektur",
        text: "Above-the-fold-Hierarchie, Social Proof, Urgency-Elemente und ein Checkout, der auf unter 3 Klicks optimiert ist.",
      },
      {
        icon: Zap,
        label: "Performance-Stack",
        text: "Shopify-Setup mit Ladezeit unter 2 Sekunden, sauberem Pixel- & Conversions-API-Tracking und rechtssicherem EU-Setup.",
      },
    ],
    kpis: [
      { label: "Time-to-Launch", value: "72 h" },
      { label: "Ziel-Conversion", value: "> 3 %" },
    ],
  },
  {
    id: 2,
    icon: Megaphone,
    title: "Ad-Buying",
    kicker: "Phase 02 · Traffic",
    headline: "Media Buying wie ein Portfolio-Manager.",
    summary: "Creative-Testing & Skalierungslogik",
    details: [
      {
        icon: LineChart,
        label: "Creative-Testing-Matrix",
        text: "Systematisches Testen von Hooks, Angles und Formaten auf Meta & TikTok — 3×3-Matrix statt zufälligem 'Boosten'.",
      },
      {
        icon: BarChart3,
        label: "ABO-zu-CBO-Skalierung",
        text: "Klare Regeln, wann ein Ad-Set stirbt und wann es in Kampagnen-Budgets skaliert wird — inklusive Kill-Kriterien.",
      },
      {
        icon: Target,
        label: "KPI-Leitplanken",
        text: "ROAS-, CPA- und CTR-Schwellen pro Funnel-Stufe, plus Retargeting-Setups, die kalten Traffic in Käufer verwandeln.",
      },
    ],
    kpis: [
      { label: "Ziel-ROAS", value: "3.5x+" },
      { label: "Testbudget", value: "50 €/Tag" },
    ],
  },
  {
    id: 3,
    icon: Truck,
    title: "Supplier Auto-Fulfillment",
    kicker: "Phase 03 · Operations",
    headline: "Deine Supply Chain läuft, während du schläfst.",
    summary: "Private Agents & Automatisierung",
    details: [
      {
        icon: Users,
        label: "Private Sourcing-Agents",
        text: "Direkte Agent-Beziehungen statt AliExpress: bessere Einkaufspreise, Qualitätskontrolle vor Versand und exklusive Produkte.",
      },
      {
        icon: Cpu,
        label: "API-Auto-Fulfillment",
        text: "Bestellungen fließen automatisch vom Shop zum Supplier — Tracking-Nummern werden ohne manuellen Klick zurückgespielt.",
      },
      {
        icon: Boxes,
        label: "Branding & Speed",
        text: "Custom Packaging, Private-Label-Optionen und EU-Lieferzeiten von 5–8 Tagen statt 3 Wochen Container-Roulette.",
      },
    ],
    kpis: [
      { label: "Lieferzeit EU", value: "5–8 Tage" },
      { label: "Fulfillment", value: "100 % auto" },
    ],
  },
  {
    id: 4,
    icon: TrendingUp,
    title: "Skalierter Profit",
    kicker: "Phase 04 · Scale",
    headline: "Vom Shop zum Cashflow-System.",
    summary: "LTV, Systeme & Exit-Optionen",
    details: [
      {
        icon: Globe,
        label: "Horizontal & vertikal skalieren",
        text: "Neue Märkte (AT/CH/NL), neue Kanäle (Google Shopping, Pinterest) und Produkt-Bundles, die den Warenkorbwert heben.",
      },
      {
        icon: Mail,
        label: "LTV-Engine",
        text: "E-Mail- & SMS-Flows (Welcome, Abandoned Cart, Post-Purchase), die 25–30 % zusätzlichen Umsatz ohne Ad-Spend liefern.",
      },
      {
        icon: ShieldCheck,
        label: "P&L-Steuerung & Systeme",
        text: "Wöchentliche Profit-Reviews, SOPs für Virtual Assistants und eine Marke, die als Asset verkaufbar wird.",
      },
    ],
    kpis: [
      { label: "Netto-Marge", value: "25–40 %" },
      { label: "Umsatz via CRM", value: "+28 %" },
    ],
  },
];

function ExplainerCard({ step }) {
  return (
    <motion.div
      key={step.id}
      initial={{ rotateY: -100, opacity: 0, scale: 0.85 }}
      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
      exit={{ rotateY: 100, opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.55, ease: EASE }}
      style={{ transformStyle: "preserve-3d" }}
      className="relative rounded-3xl border border-emerald-400/20 bg-zinc-900/70 p-7 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9),0_0_60px_-20px_rgba(52,211,153,0.4)] backdrop-blur-2xl sm:p-9"
    >
      {/* Kopf */}
      <div className="flex items-start justify-between gap-4" style={{ transform: "translateZ(50px)" }}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-400">{step.kicker}</p>
          <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{step.headline}</h3>
        </div>
        <motion.div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_0_36px_-6px_rgba(52,211,153,0.8)]"
          animate={{ rotate: [0, 6, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <step.icon className="h-7 w-7 text-zinc-950" strokeWidth={2.2} />
        </motion.div>
      </div>

      {/* Details */}
      <div className="mt-8 space-y-5" style={{ transform: "translateZ(35px)" }}>
        {step.details.map((d, i) => (
          <motion.div
            key={d.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.12, duration: 0.5, ease: EASE }}
            className="flex gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
              <d.icon className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{d.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{d.text}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* KPIs */}
      <div className="mt-7 flex flex-wrap gap-3" style={{ transform: "translateZ(45px)" }}>
        {step.kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.1, type: "spring", stiffness: 300, damping: 18 }}
            className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2"
          >
            <span className="text-xs uppercase tracking-widest text-zinc-400">{kpi.label} </span>
            <span className="ml-1 text-sm font-extrabold text-emerald-300">{kpi.value}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Explainer() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <section id="system" className="relative z-10 mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">Das System · Interaktiv</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Vier Phasen. Ein Kreislauf.{" "}
          <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
            Unfairer Vorteil.
          </span>
        </h2>
        <p className="mt-4 text-zinc-400">
          Klicke dich durch die Maschine — jede Phase öffnet die granulare Ebene dahinter.
        </p>
      </Reveal>

      <div className="mt-14 grid items-start gap-8 lg:grid-cols-[340px_1fr]">
        {/* Step-Navigation */}
        <Reveal delay={0.1} className="flex flex-col gap-3">
          {STEPS.map((s, i) => {
            const isActive = i === active;
            return (
              <motion.button
                key={s.id}
                onClick={() => setActive(i)}
                whileHover={{ x: 6 }}
                whileTap={{ scale: 0.97 }}
                className={`group relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors duration-300 ${
                  isActive
                    ? "border-emerald-400/40 bg-emerald-400/[0.09] shadow-[0_0_40px_-12px_rgba(52,211,153,0.5)]"
                    : "border-white/[0.07] bg-zinc-900/40 hover:border-emerald-400/20 hover:bg-zinc-900/70"
                }`}
              >
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-sm font-extrabold transition-colors duration-300 ${
                    isActive
                      ? "border-emerald-400/50 bg-emerald-400 text-zinc-950"
                      : "border-white/10 bg-white/5 text-zinc-400 group-hover:text-emerald-300"
                  }`}
                >
                  0{s.id}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${isActive ? "text-white" : "text-zinc-300"}`}>{s.title}</p>
                  <p className="truncate text-xs text-zinc-500">{s.summary}</p>
                </div>
                <ChevronRight
                  className={`ml-auto h-4 w-4 shrink-0 transition-all duration-300 ${
                    isActive ? "translate-x-0 text-emerald-400 opacity-100" : "-translate-x-1 text-zinc-600 opacity-40"
                  }`}
                />
                {isActive && (
                  <motion.div
                    layoutId="step-indicator"
                    className="absolute -left-px top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]"
                  />
                )}
              </motion.button>
            );
          })}

          {/* Fortschritt */}
          <div className="mt-2 px-1">
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                animate={{ width: `${((active + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.5, ease: EASE }}
              />
            </div>
            <p className="mt-2 text-right text-[11px] uppercase tracking-widest text-zinc-500">
              Phase {active + 1} / {STEPS.length}
            </p>
          </div>
        </Reveal>

        {/* 3D-Flip-Bühne */}
        <div className="[perspective:2000px]">
          <AnimatePresence mode="wait">
            <ExplainerCard key={step.id} step={step} />
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------
   PRICING — Glassmorphic Tiers mit extremem 3D-Tilt
   ------------------------------------------------------------ */
const TIERS = [
  {
    id: "knowledge",
    icon: BookOpen,
    name: "Deep-Dive Knowledge",
    price: "60",
    tagline: "Das komplette Next-Gen-Playbook zum Selbststudium.",
    featured: false,
    limited: false,
    features: [
      { icon: TrendingUp, text: "Advanced Scale-Taktiken: ABO→CBO-Frameworks & Kill-Kriterien" },
      { icon: Boxes, text: "Geprüfte Supplier-Sheets mit Private Agents & EU-Fulfillment" },
      { icon: Megaphone, text: "Plug-&-Play Ad-Templates für Meta & TikTok (Hooks + Angles)" },
      { icon: LineChart, text: "KPI-Dashboards & Margen-Kalkulatoren als Copy-Paste-Vorlage" },
      { icon: BadgeCheck, text: "Lebenslanger Zugriff inklusive aller Updates" },
    ],
  },
  {
    id: "mentorship",
    icon: Crown,
    name: "Personal Mentorship",
    price: "200",
    tagline: "Direkter 1:1-Zugang. Dein Shop, meine volle Aufmerksamkeit.",
    featured: true,
    limited: true,
    features: [
      { icon: MessageSquare, text: "Direkter 1-on-1-Zugang — Fragen werden persönlich beantwortet" },
      { icon: Store, text: "Persönliches Review deines Shops: CRO, Tracking, Angebot" },
      { icon: Target, text: "Custom Marketing-Strategie, zugeschnitten auf deine Nische" },
      { icon: Gem, text: "Persönlicher Knowledge-Transfer aus laufenden Live-Stores" },
      { icon: BookOpen, text: "Deep-Dive Knowledge (60 €) komplett inklusive" },
    ],
  },
];

function PricingCard({ tier, onJoin, delay }) {
  return (
    <Reveal delay={delay}>
      <TiltCard
        max={18}
        className={`h-full overflow-hidden rounded-[1.75rem] border p-8 backdrop-blur-2xl sm:p-9 ${
          tier.featured
            ? "border-emerald-400/35 bg-gradient-to-b from-emerald-400/[0.10] via-zinc-900/60 to-zinc-900/60 shadow-[0_0_80px_-16px_rgba(52,211,153,0.45)]"
            : "border-white/10 bg-zinc-900/50 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.8)]"
        }`}
      >
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2" style={{ transform: "translateZ(55px)" }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Coming Soon · Bald verfügbar
          </span>
          {tier.limited && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-300">
              <Flame className="h-3 w-3" />
              Streng limitiert
            </span>
          )}
        </div>

        {/* Kopf */}
        <div className="mt-6 flex items-center gap-4" style={{ transform: "translateZ(45px)" }}>
          <div
            className={`grid h-[52px] w-[52px] place-items-center rounded-2xl ${
              tier.featured
                ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_0_32px_-6px_rgba(52,211,153,0.8)]"
                : "border border-white/10 bg-white/[0.06]"
            }`}
          >
            <tier.icon className={`h-6 w-6 ${tier.featured ? "text-zinc-950" : "text-emerald-300"}`} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold tracking-tight text-white">{tier.name}</h3>
            <p className="text-sm text-zinc-400">{tier.tagline}</p>
          </div>
        </div>

        {/* Preis */}
        <div className="mt-7 flex items-end gap-2" style={{ transform: "translateZ(60px)" }}>
          <span
            className={`text-5xl font-extrabold tracking-tight ${
              tier.featured
                ? "bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent"
                : "text-white"
            }`}
          >
            {tier.price} €
          </span>
          <span className="pb-1.5 text-sm text-zinc-500">einmalig</span>
        </div>

        {/* Features */}
        <ul className="mt-7 space-y-3.5 border-t border-white/[0.07] pt-7" style={{ transform: "translateZ(35px)" }}>
          {tier.features.map((f) => (
            <li key={f.text} className="flex items-start gap-3 text-sm leading-relaxed text-zinc-300">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15">
                <Check className="h-3 w-3 text-emerald-400" strokeWidth={3} />
              </span>
              {f.text}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-8" style={{ transform: "translateZ(65px)" }}>
          <motion.button
            onClick={() => onJoin(tier)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition ${
              tier.featured
                ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-zinc-950 shadow-[0_0_44px_-10px_rgba(52,211,153,0.9)]"
                : "border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
            }`}
          >
            <Lock className="h-4 w-4" />
            Jetzt Zugang sichern
          </motion.button>
          <p className="mt-3 text-center text-xs text-zinc-500">
            Unverbindlich · Du wirst beim Launch zuerst informiert
          </p>
        </div>
      </TiltCard>
    </Reveal>
  );
}

function Pricing({ onJoin }) {
  return (
    <section id="pricing" className="relative z-10 mx-auto max-w-6xl px-5 py-24 sm:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">Programme · Early Access</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Wähle deine Stufe.{" "}
          <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
            Sichere deinen Platz.
          </span>
        </h2>
        <p className="mt-4 text-zinc-400">
          Beide Programme starten in Kürze. Die Warteliste erhält Vorrang — und den besten Preis.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-8 md:grid-cols-2">
        {TIERS.map((tier, i) => (
          <PricingCard key={tier.id} tier={tier} onJoin={onJoin} delay={0.1 + i * 0.12} />
        ))}
      </div>

      <Reveal delay={0.2} className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-zinc-500">
        <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400/70" /> Kein Abo, keine versteckten Kosten</span>
        <span className="flex items-center gap-2"><Timer className="h-4 w-4 text-emerald-400/70" /> Warteliste schließt zum Launch</span>
        <span className="flex items-center gap-2"><Users className="h-4 w-4 text-emerald-400/70" /> Mentorship auf wenige Plätze begrenzt</span>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------
   WAITLIST-MODAL — Lead Capture mit Partikel-Erfolg
   ------------------------------------------------------------ */
const PARTICLE_COLORS = ["#34d399", "#6ee7b7", "#a7f3d0", "#2dd4bf", "#ffffff"];

function SuccessParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const angle = (i / 26) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        return {
          id: i,
          x: Math.cos(angle) * (70 + Math.random() * 90),
          y: Math.sin(angle) * (70 + Math.random() * 90),
          size: 4 + Math.random() * 7,
          delay: Math.random() * 0.15,
          color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
          round: i % 3 !== 0,
        };
      }),
    []
  );

  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {/* Schockwelle */}
      <motion.span
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400/60"
        initial={{ width: 20, height: 20, opacity: 1 }}
        animate={{ width: 260, height: 260, opacity: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={{ left: 0, top: 0 }}
      />
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute"
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: [0, 1.2, 0.8], opacity: [1, 1, 0], rotate: 220 }}
          transition={{ duration: 1.1, delay: p.delay, ease: "easeOut" }}
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.round ? "9999px" : "2px",
            boxShadow: `0 0 12px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

function WaitlistModal({ tier, onClose }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const open = Boolean(tier);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    setError("");
    setSubmitted(true);
  };

  return (
    <AnimatePresence
      onExitComplete={() => {
        setEmail("");
        setError("");
        setSubmitted(false);
      }}
    >
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Premium-Warteliste"
            initial={{ opacity: 0, scale: 0.85, y: 40, rotateX: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-400/25 bg-zinc-900/90 p-8 shadow-[0_0_100px_-20px_rgba(52,211,153,0.5)] backdrop-blur-2xl"
            style={{ transformPerspective: 1200 }}
          >
            {/* Deko-Glow */}
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />

            <button
              onClick={onClose}
              aria-label="Schließen"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition hover:border-emerald-400/40 hover:text-emerald-300"
            >
              <X className="h-4 w-4" />
            </button>

            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                    <Sparkles className="h-3 w-3" />
                    {tier?.name}
                  </div>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-white">
                    Sichere dir deinen Platz auf der Liste
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Early-Access-Mitglieder erhalten den Launch-Preis, exklusive Boni und
                    Zugang, bevor die Plätze öffentlich werden.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="deine@email.de"
                        autoFocus
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 py-4 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                      />
                    </div>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs font-medium text-red-400"
                      >
                        {error}
                      </motion.p>
                    )}
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 py-4 text-sm font-bold text-zinc-950 shadow-[0_0_40px_-10px_rgba(52,211,153,0.9)]"
                    >
                      <Rocket className="h-4 w-4" />
                      Join Premium Waitlist
                    </motion.button>
                  </form>

                  <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/70" />
                    Kein Spam. Abmeldung jederzeit möglich.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="relative py-6 text-center"
                >
                  <SuccessParticles />
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                    className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_0_60px_-8px_rgba(52,211,153,0.9)]"
                  >
                    <Check className="h-10 w-10 text-zinc-950" strokeWidth={3} />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: EASE }}
                    className="mt-6 text-2xl font-extrabold tracking-tight text-white"
                  >
                    Du bist auf der Liste! 🎉
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.5, ease: EASE }}
                    className="mt-2 text-sm leading-relaxed text-zinc-400"
                  >
                    Willkommen im inneren Kreis. Du erhältst als Erste:r Bescheid,
                    sobald <span className="font-semibold text-emerald-300">{tier?.name}</span> live geht.
                  </motion.p>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    onClick={onClose}
                    className="mt-7 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-6 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
                  >
                    Zurück zur Seite
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------
   Footer
   ------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06] py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-emerald-400 to-teal-500">
            <Rocket className="h-3 w-3 text-zinc-950" strokeWidth={2.5} />
          </div>
          <span className="text-xs font-bold tracking-[0.2em] text-zinc-400">
            NEXGEN<span className="text-emerald-400">·</span>COMMERCE
          </span>
        </div>
        <p className="max-w-md text-center text-[11px] leading-relaxed text-zinc-600 sm:text-right">
          © 2026 NexGen Commerce. Alle Angaben ohne Gewähr — Ergebnisse hängen von
          individuellem Einsatz ab. Kein Erfolgsversprechen.
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------
   App — Gesamtseite
   ------------------------------------------------------------ */
export default function DropshippingLanding() {
  const [activeTier, setActiveTier] = useState(null);

  return (
    <div className="min-h-screen scroll-smooth bg-zinc-950 font-sans text-white antialiased selection:bg-emerald-400/30 selection:text-emerald-100">
      <BackgroundFX />
      <Navbar />
      <main>
        <Hero />
        <Comparison />
        <Explainer />
        <Pricing onJoin={setActiveTier} />
      </main>
      <Footer />
      <WaitlistModal tier={activeTier} onClose={() => setActiveTier(null)} />
    </div>
  );
}
