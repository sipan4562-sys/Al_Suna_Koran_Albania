import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "@/lib/shared/types";
import { splitMarkdownBlocks } from "@/lib/client/markdown-blocks";
import { readNdjson } from "@/lib/client/ndjson";
import { buildSystemPrompt } from "@/server/ai/prompt";
import { extractLocation, extractMemory } from "@/server/ai/providers/demo";
import { ChatRequestSchema, ProfilePatchSchema, sanitizeProfile } from "@/server/validation";

describe("System-Prompt", () => {
  const base = {
    profile: DEFAULT_PROFILE,
    mode: "text" as const,
    memories: [],
    skillHints: ["Wetter über get_weather"],
    webSearch: false,
    timezone: "Europe/Berlin",
    now: new Date("2026-11-06T18:30:00Z"),
  };

  it("enthält Persönlichkeit, Fähigkeiten und Datum", () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt.stable).toContain("J.A.R.V.I.S.");
    expect(prompt.stable).toContain("britischen Humor");
    expect(prompt.stable).toContain("get_weather");
    expect(prompt.dynamic).toContain("2026");
    expect(prompt.dynamic).toContain("19:30"); // Europe/Berlin = UTC+1 im November
    expect(prompt.dynamic).toContain("AUSGABEMODUS: TEXT-CHAT");
  });

  it("passt sich an Sprachmodus, Profil und Gedächtnis an", () => {
    const prompt = buildSystemPrompt({
      ...base,
      mode: "voice",
      profile: { ...DEFAULT_PROFILE, userName: "Tony", formOfAddress: "Sir", personality: "concise", homeCity: "Malibu" },
      memories: [{ id: "1", content: "Mag Espresso", category: "praeferenz", createdAt: "" }],
    });
    expect(prompt.stable).toContain("Tony");
    expect(prompt.stable).toContain("„Sir“");
    expect(prompt.stable).toContain("präzise");
    expect(prompt.dynamic).toContain("Malibu");
    expect(prompt.dynamic).toContain("Mag Espresso");
    expect(prompt.dynamic).toContain("AUSGABEMODUS: SPRACHE");
  });

  it("hält den stabilen Teil unabhängig von Uhrzeit und Modus (Prompt-Caching)", () => {
    const a = buildSystemPrompt(base);
    const b = buildSystemPrompt({ ...base, mode: "voice", now: new Date("2027-01-01T00:00:00Z") });
    expect(a.stable).toBe(b.stable);
    expect(a.dynamic).not.toBe(b.dynamic);
  });
});

describe("Markdown-Blöcke", () => {
  it("trennt an Leerzeilen, aber nie innerhalb von Codeblöcken", () => {
    const md = "Absatz eins\n\n```js\nconst a = 1;\n\nconst b = 2;\n```\n\n- Liste\n- Punkt";
    expect(splitMarkdownBlocks(md)).toEqual(["Absatz eins", "```js\nconst a = 1;\n\nconst b = 2;\n```", "- Liste\n- Punkt"]);
  });

  it("behandelt nicht geschlossene Codeblöcke beim Streamen", () => {
    expect(splitMarkdownBlocks("Text\n\n```py\nprint(1)\n\nprint(2)")).toEqual(["Text", "```py\nprint(1)\n\nprint(2)"]);
  });
});

describe("NDJSON-Stream", () => {
  it("setzt über Chunk-Grenzen verteilte Zeilen korrekt zusammen", async () => {
    const encoder = new TextEncoder();
    const chunks = ['{"type":"text","de', 'lta":"Hal', 'lo"}\n{"type":"done"}', "\nkaputt\n"];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
        controller.close();
      },
    });
    const events: unknown[] = [];
    for await (const event of readNdjson(stream)) events.push(event);
    expect(events).toEqual([{ type: "text", delta: "Hallo" }, { type: "done" }]);
  });
});

describe("Validierung", () => {
  it("bereinigt Chat-Anfragen", () => {
    const parsed = ChatRequestSchema.parse({ message: "  Hallo\u0000 ", timezone: "Mars/Olympus" });
    expect(parsed).toMatchObject({ message: "Hallo", mode: "text", timezone: undefined });
    expect(ChatRequestSchema.safeParse({ message: "   " }).success).toBe(false);
    expect(ChatRequestSchema.safeParse({ message: "x".repeat(12_001) }).success).toBe(false);
    expect(ChatRequestSchema.safeParse({ message: "Hi", conversationId: "keine-uuid" }).success).toBe(false);
  });

  it("Profil-Patches enthalten nur die übergebenen Felder (keine Standardwerte)", () => {
    expect(ProfilePatchSchema.parse({ personality: "witty" })).toEqual({ personality: "witty" });
    expect(ProfilePatchSchema.parse({ userName: "  Tony ", unknown: 1 })).toEqual({ userName: "Tony" });
    expect(ProfilePatchSchema.safeParse({ personality: "evil" }).success).toBe(false);
  });

  it("verwirft ungültige Profilwerte statt abzustürzen", () => {
    expect(sanitizeProfile({ personality: "evil", language: "xx", userName: 42, homeCity: "Berlin" })).toEqual({
      ...DEFAULT_PROFILE,
      homeCity: "Berlin",
    });
  });
});

describe("Demo-Erkennung", () => {
  it("findet Orte und Merksätze", () => {
    expect(extractLocation("Wie ist das Wetter in Bad Homburg morgen?")).toBe("Bad Homburg");
    expect(extractLocation("Wetter für München?")).toBe("München");
    expect(extractLocation("Wie ist das Wetter?")).toBeUndefined();
    expect(extractMemory("Merke dir, dass ich Tee mag.")).toBe("ich Tee mag");
  });
});
