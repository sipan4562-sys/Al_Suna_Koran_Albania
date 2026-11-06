"use client";

import { cn } from "@/lib/client/cn";
import { clockTime, hudDate } from "@/lib/client/format";
import { useNowSeconds } from "@/lib/client/hooks";

/** HUD-Uhr – wird erst im Browser befüllt (keine Hydration-Abweichung). */
export function Clock({ className, showDate = true }: { className?: string; showDate?: boolean }) {
  const seconds = useNowSeconds();
  const now = seconds === null ? null : new Date(seconds * 1000);

  return (
    <div className={cn("text-right font-mono tabular-nums", className)}>
      <div className="text-sm tracking-[0.18em] text-arc-soft text-glow sm:text-base">
        {now ? clockTime(now) : "--:--:--"}
      </div>
      {showDate && (
        <div className="hud-label mt-0.5 text-[10px] text-ink-faint">{now ? hudDate(now) : " "}</div>
      )}
    </div>
  );
}
