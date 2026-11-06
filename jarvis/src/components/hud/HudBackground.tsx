import type { CSSProperties } from "react";

// Deterministische Partikel (kein Math.random → keine Hydration-Unterschiede).
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  delay: `${-((i * 1.7) % 18).toFixed(1)}s`,
  duration: `${14 + (i % 7) * 2.3}s`,
  opacity: 0.2 + (i % 5) * 0.12,
  dx: `${((i % 9) - 4) * 9}px`,
}));

/** Statischer, leichtgewichtiger HUD-Hintergrund (nur CSS). */
export function HudBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-void">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_75%_at_50%_42%,#0c2745_0%,#061428_36%,#030812_62%,#02040a_100%)]" />
      <div className="hud-grid absolute inset-0 opacity-80" />
      <div className="absolute inset-x-0 top-0 h-48 animate-scan bg-gradient-to-b from-transparent via-arc/[0.05] to-transparent" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={
            {
              left: p.left,
              "--delay": p.delay,
              "--d": p.duration,
              "--o": p.opacity,
              "--dx": p.dx,
            } as CSSProperties
          }
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.7)_100%)]" />
    </div>
  );
}
