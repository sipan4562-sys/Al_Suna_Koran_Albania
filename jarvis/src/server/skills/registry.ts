import "server-only";
import type { SystemModule } from "@/lib/shared/types";
import type { AnyToolDefinition } from "@/server/ai/types";
import { memorySkill } from "./memory";
import type { Skill } from "./types";
import { weatherSkill } from "./weather";

/** Alle eingebauten Skills. Neue Skills hier registrieren. */
export const ALL_SKILLS: Skill[] = [memorySkill, weatherSkill];

/**
 * Vorbereitete Erweiterungen – erscheinen im HUD als "geplant" und zeigen,
 * wo neue Fähigkeiten andocken. Siehe README → "Erweiterungen".
 */
export const PLANNED_MODULES: SystemModule[] = [
  { id: "calendar", name: "Kalender", description: "Termine lesen und planen", status: "planned" },
  { id: "reminders", name: "Erinnerungen", description: "Zeitgesteuerte Erinnerungen", status: "planned" },
  { id: "files", name: "Dateianalyse", description: "PDFs, Bilder und Dokumente auswerten", status: "planned" },
  { id: "smarthome", name: "Smart Home", description: "Geräte über Home Assistant steuern", status: "planned" },
  { id: "desktop", name: "Desktop-Link", description: "Sichere Steuerung des PCs", status: "planned" },
];

export function activeSkills(): Skill[] {
  return ALL_SKILLS.filter((skill) => skill.status() === "online");
}

export function activeTools(): AnyToolDefinition[] {
  const tools = activeSkills().flatMap((skill) => skill.tools);
  // Deterministische Reihenfolge – wichtig für Prompt-Caching.
  return [...tools].sort((a, b) => a.name.localeCompare(b.name));
}

export function skillPromptHints(): string[] {
  return activeSkills()
    .map((skill) => skill.promptHint)
    .filter((hint): hint is string => Boolean(hint));
}

export function skillModules(): SystemModule[] {
  return ALL_SKILLS.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    status: skill.status(),
  }));
}
