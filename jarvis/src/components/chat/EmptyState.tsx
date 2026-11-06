"use client";

import { Brain, CloudSun, Code2, Lightbulb, type LucideIcon } from "lucide-react";
import { CoreVisualizer } from "@/components/hud/CoreVisualizer";
import { jarvis } from "@/lib/client/controller";

const SUGGESTIONS: Array<{ icon: LucideIcon; title: string; prompt: string }> = [
  { icon: CloudSun, title: "Wetter", prompt: "Wie wird das Wetter morgen in Berlin?" },
  { icon: Lightbulb, title: "Erklären", prompt: "Erkläre mir Quantencomputing in drei Sätzen." },
  { icon: Code2, title: "Programmieren", prompt: "Schreib mir eine Python-Funktion, die Primzahlen prüft." },
  { icon: Brain, title: "Gedächtnis", prompt: "Merke dir, dass ich meinen Kaffee schwarz trinke." },
];

export function EmptyState() {
  return (
    <div className="flex flex-col items-center pt-6 text-center sm:pt-12">
      <div className="size-28 sm:size-32">
        <CoreVisualizer variant="mini" />
      </div>
      <h2 className="mt-4 font-display text-base font-semibold tracking-[0.32em] text-arc-soft text-glow sm:text-lg">
        WIE KANN ICH HELFEN?
      </h2>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        Schreib eine Nachricht oder tippe auf das Mikrofon. Ich merke mir den Verlauf für dich.
      </p>
      <div className="mt-7 grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
          <button
            key={title}
            type="button"
            onClick={() => void jarvis.send(prompt, { source: "text" })}
            className="glass group flex items-start gap-3 rounded-xl p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-line-strong"
          >
            <Icon className="mt-0.5 size-4 shrink-0 text-arc" />
            <span className="min-w-0">
              <span className="hud-label block text-[11px] text-arc-soft">{title}</span>
              <span className="mt-0.5 block text-sm text-ink-muted group-hover:text-ink">{prompt}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
