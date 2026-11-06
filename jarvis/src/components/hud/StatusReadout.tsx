"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/client/cn";
import { PHASE_LABELS, selectPhase, useJarvis, type Phase } from "@/lib/client/store";

function PhaseGlyph({ phase }: { phase: Phase }) {
  if (phase === "listening" || phase === "speaking" || phase === "responding") {
    return (
      <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="eq-bar block w-[3px] rounded-full bg-arc shadow-[0_0_8px_rgba(95,243,255,0.8)]"
            style={{ height: "100%", animationDelay: `${i * 0.12}s`, animationDuration: `${0.7 + (i % 3) * 0.18}s` }}
          />
        ))}
      </span>
    );
  }
  if (phase === "thinking") {
    return (
      <span className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block size-1.5 rotate-45 bg-amber shadow-[0_0_8px_rgba(255,181,71,0.9)]"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block size-2 rounded-full",
        phase === "error" ? "bg-alert shadow-[0_0_10px_rgba(255,92,122,0.9)]" : "bg-arc/70 animate-pulse-slow",
      )}
    />
  );
}

/** "J.A.R.V.I.S. ONLINE" + aktueller Zustand (hört zu / denkt nach / spricht). */
export function StatusReadout({ compact = false }: { compact?: boolean }) {
  const phase = useJarvis(selectPhase);
  const status = useJarvis((s) => s.status);
  const statusError = useJarvis((s) => s.statusError);
  const { label, hint } = PHASE_LABELS[phase];

  const online = !statusError;
  const systemText = !online ? "Verbindung gestört" : status?.ai.demo ? "Online · Demo-Modus" : "Online";

  return (
    <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
      <div
        className={cn(
          "glass flex items-center gap-2 rounded-full px-3 py-1",
          !online && "border-alert/50",
          status?.ai.demo && online && "border-amber/40",
        )}
      >
        <span
          className={cn(
            "relative flex size-2 rounded-full",
            online ? (status?.ai.demo ? "bg-amber" : "bg-ok") : "bg-alert",
          )}
        >
          <span
            className={cn(
              "absolute inset-0 animate-ping rounded-full opacity-60",
              online ? (status?.ai.demo ? "bg-amber" : "bg-ok") : "bg-alert",
            )}
          />
        </span>
        <span className="hud-label text-[11px] text-ink">
          J.A.R.V.I.S. <span className="text-ink-muted">· {systemText}</span>
        </span>
      </div>

      <div className={cn("flex items-center gap-3", compact ? "mt-2" : "mt-3 sm:mt-4 short:mt-2")}>
        <PhaseGlyph phase={phase} />
        <motion.span
          key={phase}
          initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.25 }}
          className={cn(
            "font-display text-base font-semibold tracking-[0.42em] uppercase sm:text-lg",
            phase === "error" ? "text-alert" : phase === "thinking" ? "text-amber" : "text-arc-soft text-glow",
          )}
        >
          {label}
        </motion.span>
        <PhaseGlyph phase={phase} />
      </div>
      {!compact && <p className="mt-1.5 hidden text-xs text-ink-faint sm:block short:hidden">{hint}</p>}
    </div>
  );
}
