import "server-only";
import type { ModuleStatus } from "@/lib/shared/types";
import type { AnyToolDefinition } from "@/server/ai/types";

/**
 * Ein Skill bündelt eine Fähigkeit von JARVIS: Werkzeuge, die das
 * Sprachmodell aufrufen kann, plus optionale Hinweise für den System-Prompt.
 *
 * Neuen Skill hinzufügen:
 *   1. Datei in `src/server/skills/` anlegen (siehe `weather.ts`).
 *   2. Den Skill in `registry.ts` in `ALL_SKILLS` eintragen.
 * Werkzeuge werden automatisch allen KI-Anbietern bereitgestellt.
 */
export interface Skill {
  id: string;
  /** Anzeigename im HUD */
  name: string;
  description: string;
  /** Ob der Skill gerade aktiv ist (z. B. abhängig von .env). */
  status(): ModuleStatus;
  tools: AnyToolDefinition[];
  /** Zusatzanweisung für den System-Prompt, wenn der Skill aktiv ist. */
  promptHint?: string;
}
