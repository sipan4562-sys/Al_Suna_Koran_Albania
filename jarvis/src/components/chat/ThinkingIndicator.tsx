"use client";

import { motion } from "motion/react";

/** Ladeanimation, solange noch kein Text der Antwort angekommen ist. */
export function ThinkingIndicator({ label = "JARVIS denkt nach" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1" role="status" aria-label={label}>
      <div className="relative h-1 w-24 overflow-hidden rounded-full bg-arc/10">
        <motion.div
          className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-arc to-transparent"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <span className="hud-label text-[11px] text-ink-muted">{label}</span>
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1 rounded-full bg-arc"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </span>
    </div>
  );
}
