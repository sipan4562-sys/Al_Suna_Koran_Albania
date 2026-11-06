"use client";

import { History, Settings2 } from "lucide-react";
import { useJarvis } from "@/lib/client/store";
import { IconButton } from "@/components/ui/IconButton";
import { Clock } from "./Clock";

export function Logo({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <div className="min-w-0 select-none">
      <div className="font-display text-sm font-bold tracking-[0.34em] whitespace-nowrap text-arc-soft text-glow min-[360px]:text-base min-[360px]:tracking-[0.42em] sm:text-lg">
        J.A.R.V.I.S.
      </div>
      {subtitle && (
        <div className="hud-label mt-0.5 hidden text-[9px] text-ink-faint sm:block short:hidden">
          Persönliches KI-System
        </div>
      )}
    </div>
  );
}

/** Kopfleiste des Hauptbildschirms. */
export function TopBar() {
  const set = useJarvis((s) => s.set);
  const status = useJarvis((s) => s.status);

  return (
    <header className="relative z-20 flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,var(--safe-top))] pb-2 sm:px-6 sm:pt-[max(1.25rem,var(--safe-top))] short:pt-[max(0.5rem,var(--safe-top))] short:pb-0">
      <Logo />
      <div className="hidden items-center gap-2 lg:flex">
        <span className="hud-label rounded-full border border-line px-3 py-1 text-[10px] text-ink-muted">
          {status ? `${status.ai.providerLabel} · ${status.ai.model}` : "Initialisiere …"}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Clock className="mr-1 hidden sm:block short:hidden" />
        <IconButton label="Verlauf" size="sm" onClick={() => set({ panel: "history" })}>
          <History />
        </IconButton>
        <IconButton label="Einstellungen" size="sm" onClick={() => set({ panel: "settings" })}>
          <Settings2 />
        </IconButton>
      </div>
    </header>
  );
}
