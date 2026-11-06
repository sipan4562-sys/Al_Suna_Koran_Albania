"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { audioLevels } from "@/lib/audio/levels";
import { cn } from "@/lib/client/cn";
import { jarvis } from "@/lib/client/controller";
import { useJarvis } from "@/lib/client/store";

const SIZES = {
  lg: "size-20 sm:size-[86px] [&_svg]:size-8",
  md: "size-12 [&_svg]:size-5",
  sm: "size-10 [&_svg]:size-[18px]",
};

/** Großer Mikrofon-Button mit pegelabhängigem Leuchten und Wellenringen. */
export function MicButton({ size = "lg", className }: { size?: keyof typeof SIZES; className?: string }) {
  const listening = useJarvis((s) => s.listening);
  const available = useJarvis((s) => s.sttAvailable);
  const glowRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!listening || !glow) return;
    let frame = 0;
    let level = 0;
    const tick = () => {
      level += (audioLevels.input - level) * 0.3;
      glow.style.transform = `scale(${1 + level * 0.55})`;
      glow.style.opacity = String(0.45 + level * 0.55);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      glow.style.transform = "";
      glow.style.opacity = "";
    };
  }, [listening]);

  return (
    <button
      type="button"
      onClick={() => void jarvis.toggleListening()}
      disabled={!available}
      aria-pressed={listening}
      aria-label={available ? (listening ? "Zuhören beenden" : "Spracheingabe starten") : "Spracheingabe nicht verfügbar"}
      title={available ? (listening ? "Zuhören beenden (Leertaste)" : "Sprechen (Leertaste)") : "Spracheingabe in diesem Browser nicht verfügbar"}
      className={cn(
        "group relative inline-flex shrink-0 touch-manipulation items-center justify-center rounded-full transition-transform duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
        SIZES[size],
        className,
      )}
    >
      {listening && (
        <>
          <span className="ripple absolute inset-0 rounded-full border-2 border-arc/60" />
          <span className="ripple absolute inset-0 rounded-full border border-arc/40 [animation-delay:0.6s]" />
          <span className="ripple absolute inset-0 rounded-full border border-arc/25 [animation-delay:1.2s]" />
        </>
      )}
      <span
        ref={glowRef}
        className={cn(
          "absolute inset-0 rounded-full blur-xl transition-opacity",
          listening ? "bg-arc/50" : "bg-arc/15 opacity-60 group-hover:opacity-100",
        )}
      />
      <span
        className={cn(
          "relative z-10 flex size-full items-center justify-center rounded-full border transition-colors duration-300",
          listening
            ? "border-arc-soft bg-gradient-to-b from-arc-soft to-arc-dim text-void shadow-[0_0_40px_rgba(95,243,255,0.65)]"
            : "glass-strong border-arc/50 text-arc-soft shadow-[0_0_24px_rgba(95,243,255,0.25),inset_0_0_20px_rgba(95,243,255,0.15)] group-hover:border-arc",
        )}
      >
        {available ? <Mic strokeWidth={2.2} /> : <MicOff />}
      </span>
    </button>
  );
}
