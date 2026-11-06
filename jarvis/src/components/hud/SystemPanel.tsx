"use client";

import {
  Bell,
  Brain,
  Calendar,
  CloudSun,
  Cpu,
  Database,
  FileText,
  House,
  Mic,
  Monitor,
  Search,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/client/cn";
import { useJarvis } from "@/lib/client/store";
import type { ModuleStatus, SystemModule } from "@/lib/shared/types";

const ICONS: Record<string, LucideIcon> = {
  core: Cpu,
  "voice-out": Volume2,
  "voice-in": Mic,
  storage: Database,
  memory: Brain,
  weather: CloudSun,
  websearch: Search,
  calendar: Calendar,
  reminders: Bell,
  files: FileText,
  smarthome: House,
  desktop: Monitor,
};

const STATUS_STYLE: Record<ModuleStatus, { dot: string; text: string; label: string }> = {
  online: { dot: "bg-ok shadow-[0_0_8px_rgba(77,255,195,0.8)]", text: "text-ok", label: "Online" },
  standby: { dot: "bg-amber shadow-[0_0_8px_rgba(255,181,71,0.7)]", text: "text-amber", label: "Standby" },
  offline: { dot: "bg-alert", text: "text-alert", label: "Offline" },
  planned: { dot: "bg-ink-faint/60", text: "text-ink-faint", label: "Geplant" },
};

const NO_MODULES: SystemModule[] = [];

export function SystemPanel({ className }: { className?: string }) {
  // Selektoren müssen stabile Referenzen liefern (kein neues [] pro Aufruf).
  const modules = useJarvis((s) => s.status?.modules) ?? NO_MODULES;
  const active = modules.filter((m) => m.status !== "planned");
  const planned = modules.filter((m) => m.status === "planned");

  return (
    <section
      className={cn("glass hud-frame flex max-h-[calc(100%-1rem)] flex-col rounded-2xl p-4", className)}
      aria-label="Systemmodule"
    >
      <header className="mb-2 flex items-center justify-between">
        <h2 className="hud-label text-xs text-arc">Systemmodule</h2>
        <span className="font-mono text-[10px] text-ink-faint">
          {active.filter((m) => m.status === "online").length}/{active.length || "–"} online
        </span>
      </header>
      <ul className="no-scrollbar min-h-0 space-y-0.5 overflow-y-auto">
        {modules.length === 0 &&
          Array.from({ length: 6 }, (_, i) => <li key={i} className="h-8 animate-pulse rounded-lg bg-arc/[0.04]" />)}
        {active.map((module) => {
          const Icon = ICONS[module.id] ?? Cpu;
          const style = STATUS_STYLE[module.status];
          return (
            <li
              key={module.id}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-arc/[0.05]"
              title={module.description}
            >
              <Icon className="size-4 shrink-0 text-arc" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-hud text-sm leading-tight font-semibold tracking-wide text-ink">
                  {module.name}
                </div>
                <div className="truncate text-[11px] leading-tight text-ink-faint">{module.description}</div>
              </div>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className={cn("size-1.5 rounded-full", style.dot)} />
                <span className={cn("hud-label text-[9px]", style.text)}>{style.label}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {planned.length > 0 && (
        <div className="mt-3 border-t border-line/60 pt-3">
          <h3 className="hud-label mb-2 text-[9px] text-ink-faint">Erweiterungen · geplant</h3>
          <ul className="flex flex-wrap gap-1.5">
            {planned.map((module) => {
              const Icon = ICONS[module.id] ?? Cpu;
              return (
                <li
                  key={module.id}
                  title={module.description}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line/70 px-2 py-0.5 text-[11px] text-ink-faint"
                >
                  <Icon className="size-3" />
                  {module.name}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
