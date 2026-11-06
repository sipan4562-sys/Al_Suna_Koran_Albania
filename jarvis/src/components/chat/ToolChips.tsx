"use client";

import { Brain, Check, CloudSun, LoaderCircle, Search, Wrench, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/client/cn";
import type { ToolActivity } from "@/lib/shared/types";

const ICONS: Record<string, LucideIcon> = {
  get_weather: CloudSun,
  remember_fact: Brain,
  forget_fact: Brain,
  search_memory: Brain,
  web_search: Search,
};

/** Zeigt, welche Fähigkeiten JARVIS für eine Antwort genutzt hat. */
export function ToolChips({ tools }: { tools?: ToolActivity[] }) {
  if (!tools || tools.length === 0) return null;
  return (
    <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Genutzte Fähigkeiten">
      {tools.map((tool) => {
        const Icon = ICONS[tool.name] ?? Wrench;
        return (
          <li
            key={tool.id}
            className={cn(
              "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
              tool.status === "error" ? "border-alert/40 text-alert" : "border-line-strong/60 text-ink-muted",
              tool.status === "running" && "sweep relative overflow-hidden",
            )}
          >
            <Icon className="size-3.5 shrink-0 text-arc" />
            <span className="truncate">{tool.label}</span>
            {tool.detail && <span className="truncate text-ink-faint">· {tool.detail}</span>}
            {tool.status === "running" && <LoaderCircle className="size-3 shrink-0 animate-spin text-arc" />}
            {tool.status === "success" && <Check className="size-3 shrink-0 text-ok" />}
            {tool.status === "error" && <X className="size-3 shrink-0" />}
          </li>
        );
      })}
    </ul>
  );
}
