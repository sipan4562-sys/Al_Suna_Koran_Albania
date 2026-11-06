"use client";

import { useEffect, useRef, useState } from "react";
import { audioLevels } from "@/lib/audio/levels";
import { cn } from "@/lib/client/cn";
import { useJarvis } from "@/lib/client/store";

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2 last:border-0">
      <dt className="hud-label text-[10px] text-ink-faint">{label}</dt>
      <dd className={cn("truncate text-right font-mono text-xs", accent ? "text-arc-soft" : "text-ink")}>{value}</dd>
    </div>
  );
}

/** Live-Pegelanzeige (Mikrofon/Ausgabe) ohne React-Re-Renders. */
function AudioMeter() {
  const inputRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    let input = 0;
    let output = 0;
    const tick = () => {
      input += (audioLevels.input - input) * 0.25;
      const out = audioLevels.outputIsReal ? audioLevels.output : useJarvis.getState().speaking ? 0.35 : 0;
      output += (out - output) * 0.2;
      if (inputRef.current) inputRef.current.style.transform = `scaleX(${Math.max(0.02, input)})`;
      if (outputRef.current) outputRef.current.style.transform = `scaleX(${Math.max(0.02, output)})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="mt-3 space-y-2">
      {[
        { label: "Eingang", ref: inputRef },
        { label: "Ausgang", ref: outputRef },
      ].map(({ label, ref }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="hud-label w-14 text-[9px] text-ink-faint">{label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-arc/10">
            <div
              ref={ref}
              className="h-full origin-left rounded-full bg-gradient-to-r from-arc-dim to-arc shadow-[0_0_10px_rgba(95,243,255,0.7)]"
              style={{ transform: "scaleX(0.02)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TelemetryPanel({ className }: { className?: string }) {
  const status = useJarvis((s) => s.status);
  const latency = useJarvis((s) => s.lastLatencyMs);
  const mode = useJarvis((s) => s.prefs.mode);
  const ttsEngine = useJarvis((s) => s.prefs.ttsEngine);
  const [uptime, setUptime] = useState("00:00");

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const total = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      setUptime(`${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const voice =
    ttsEngine === "browser" || !status?.speech.serverTts
      ? "Browser"
      : status.speech.serverTts === "openai"
        ? "OpenAI Neural"
        : "ElevenLabs";

  return (
    <section className={cn("glass hud-frame rounded-2xl p-4", className)} aria-label="Telemetrie">
      <header className="mb-1 flex items-center justify-between">
        <h2 className="hud-label text-xs text-arc">Telemetrie</h2>
        <span className="font-mono text-[10px] text-ink-faint">v{status?.version ?? "–"}</span>
      </header>
      <dl>
        <Row label="KI-Kern" value={status ? status.ai.providerLabel : "…"} accent />
        <Row label="Modell" value={status?.ai.model ?? "…"} />
        <Row label="Latenz" value={latency !== null ? `${latency} ms` : "–"} />
        <Row label="Modus" value={mode === "voice" ? "Sprache" : "Text"} />
        <Row label="Stimme" value={voice} />
        <Row label="Gedächtnis" value={status ? `${status.memoryCount} Fakten` : "…"} />
        <Row label="Gespräche" value={status ? String(status.conversationCount) : "…"} />
        <Row label="Sitzung" value={uptime} />
      </dl>
      <AudioMeter />
    </section>
  );
}
