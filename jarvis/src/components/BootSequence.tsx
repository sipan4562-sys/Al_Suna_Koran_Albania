"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/client/cn";
import { useJarvis } from "@/lib/client/store";

const STEP_MS = 230;

/** Kurze Start-Sequenz (einmal pro Browser-Sitzung, überspringbar). */
export function BootSequence({ onDone }: { onDone: () => void }) {
  const status = useJarvis((s) => s.status);
  const [step, setStep] = useState(0);

  const lines = [
    { text: "Initialisiere Kernsysteme", ok: "OK" },
    { text: "Neuronale Schnittstelle", ok: "OK" },
    { text: "Sprachmodul kalibriert", ok: "OK" },
    {
      text: status ? `KI-Kern: ${status.ai.providerLabel}` : "Verbinde KI-Kern",
      ok: status ? (status.ai.demo ? "DEMO" : "OK") : "…",
    },
    { text: "Alle Systeme online", ok: "" },
  ];

  useEffect(() => {
    if (step >= lines.length) {
      const timer = setTimeout(onDone, 420);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [step, lines.length, onDone]);

  useEffect(() => {
    const skip = () => onDone();
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [onDone]);

  const progress = Math.min(1, step / lines.length);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(8px)", scale: 1.04 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed inset-0 z-[80] flex cursor-pointer items-center justify-center bg-void/95 px-6"
      onClick={onDone}
      role="dialog"
      aria-label="JARVIS startet"
      data-testid="boot-sequence"
    >
      <div className="w-full max-w-sm">
        <div className="relative mx-auto mb-8 size-28">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-arc/20 border-t-arc [animation-duration:1.6s]" />
          <div className="absolute inset-3 animate-spin rounded-full border border-dashed border-arc/40 [animation-direction:reverse] [animation-duration:5s]" />
          <div className="absolute inset-8 rounded-full bg-arc/30 blur-md" />
          <div className="absolute inset-10 rounded-full bg-arc-soft shadow-[0_0_30px_rgba(95,243,255,0.9)]" />
        </div>
        <h1 className="text-center font-display text-2xl font-bold tracking-[0.45em] text-arc-soft text-glow">
          J.A.R.V.I.S.
        </h1>
        <ul className="mt-6 space-y-1.5 font-mono text-xs">
          {lines.map((line, index) => (
            <li
              key={index}
              className={cn(
                "flex justify-between gap-4 transition-opacity duration-200",
                index < step ? "opacity-100" : "opacity-0",
                index === lines.length - 1 ? "text-arc-soft" : "text-ink-muted",
              )}
            >
              <span>&gt; {line.text}</span>
              <span className={line.ok === "DEMO" ? "text-amber" : "text-ok"}>{line.ok}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-arc/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-arc-dim to-arc-soft shadow-[0_0_12px_rgba(95,243,255,0.8)] transition-[width] duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="hud-label mt-4 text-center text-[9px] text-ink-faint">Tippen zum Überspringen</p>
      </div>
    </motion.div>
  );
}
