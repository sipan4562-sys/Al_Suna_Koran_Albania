import "server-only";
import { z } from "zod";
import { getEnv } from "@/server/config/env";
import type { ToolDefinition } from "@/server/ai/types";
import {
  addMemory,
  deleteMemoriesMatching,
  searchMemories,
} from "@/server/db/repositories/memories";
import type { Skill } from "./types";

/** Persönliches Gedächtnis: dauerhafte Fakten über den Nutzer. */

const CATEGORIES = ["person", "praeferenz", "arbeit", "gesundheit", "termin", "sonstiges"] as const;

const RememberInput = z.object({
  fact: z
    .string()
    .trim()
    .min(2)
    .max(500)
    .describe(
      "Der Fakt in einem kurzen, eigenständigen Satz aus Sicht von JARVIS, z. B. 'Der Nutzer trinkt seinen Kaffee schwarz.'",
    ),
  category: z.enum(CATEGORIES).optional().describe("Grobe Kategorie des Fakts."),
});

const QueryInput = z.object({
  query: z.string().trim().min(1).max(200).describe("Suchbegriff (Teilwort genügt)."),
});

const remember: ToolDefinition<z.infer<typeof RememberInput>> = {
  name: "remember_fact",
  description:
    "Speichert einen dauerhaften Fakt über den Nutzer im persönlichen Gedächtnis. " +
    "Nutze es, wenn der Nutzer dich bittet, sich etwas zu merken, oder wenn er wichtige, " +
    "stabile persönliche Informationen teilt (Vorlieben, Namen, Ziele). " +
    "Speichere niemals Passwörter, PINs oder andere Geheimnisse.",
  schema: RememberInput,
  label: () => "Speichere im Gedächtnis",
  async run(input, ctx) {
    const result = await addMemory(ctx.userId, input.fact, input.category ?? "sonstiges");
    if (result.status === "full") {
      return {
        ok: false,
        content: JSON.stringify({ error: "Memory is full. Ask the user to delete old memories in the settings." }),
        summary: "Gedächtnis voll",
      };
    }
    return {
      ok: true,
      content: JSON.stringify({ status: result.status, stored: result.memory.content }),
      summary: result.status === "duplicate" ? "War bereits gespeichert" : "Gespeichert",
    };
  },
};

const forget: ToolDefinition<z.infer<typeof QueryInput>> = {
  name: "forget_fact",
  description:
    "Löscht Fakten aus dem persönlichen Gedächtnis, die den Suchbegriff enthalten. " +
    "Nutze es, wenn der Nutzer dich bittet, etwas zu vergessen.",
  schema: QueryInput,
  label: (input) => (input.query ? `Vergesse: ${input.query}` : "Vergesse Fakt"),
  async run(input, ctx) {
    const deleted = await deleteMemoriesMatching(ctx.userId, input.query);
    return {
      ok: true,
      content: JSON.stringify({ deleted: deleted.map((m) => m.content) }),
      summary: deleted.length ? `${deleted.length} gelöscht` : "Nichts gefunden",
    };
  },
};

const search: ToolDefinition<z.infer<typeof QueryInput>> = {
  name: "search_memory",
  description:
    "Durchsucht das persönliche Gedächtnis nach gespeicherten Fakten. Die wichtigsten " +
    "Fakten stehen bereits im System-Prompt; nutze die Suche für ältere Details.",
  schema: QueryInput,
  label: (input) => (input.query ? `Erinnere: ${input.query}` : "Durchsuche Gedächtnis"),
  async run(input, ctx) {
    const found = await searchMemories(ctx.userId, input.query, 20);
    return {
      ok: true,
      content: JSON.stringify({ results: found.map((m) => ({ fact: m.content, saved: m.createdAt })) }),
      summary: `${found.length} Treffer`,
    };
  },
};

export const memorySkill: Skill = {
  id: "memory",
  name: "Gedächtnis",
  description: "Merkt sich Fakten und Vorlieben über dich",
  status: () => (getEnv().SKILL_MEMORY ? "online" : "offline"),
  tools: [remember, forget, search],
  promptHint:
    "Du hast ein persönliches Gedächtnis (remember_fact, forget_fact, search_memory). " +
    "Bestätige kurz, wenn du dir etwas gemerkt oder etwas vergessen hast.",
};
