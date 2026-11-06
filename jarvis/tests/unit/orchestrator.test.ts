import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatStreamEvent } from "@/lib/shared/types";
import { ProviderError, type ChatProvider, type ProviderRunInput } from "@/server/ai/types";
import { setupTestEnvironment } from "../support/test-env";

// Anbieter-Konfiguration pro Test austauschbar machen.
const providers: { primary: ChatProvider; fallback: ChatProvider | null } = {
  primary: null as unknown as ChatProvider,
  fallback: null,
};
vi.mock("@/server/ai/registry", () => ({
  getProviderSetup: () => ({ primary: providers.primary, fallback: providers.fallback, demo: false }),
  resetProviderCache: () => undefined,
}));

const { buildHistory, deriveTitle, runChatTurn } = await import("@/server/ai/orchestrator");
const { listMessages } = await import("@/server/db/repositories/conversations");

function fakeProvider(id: ChatProvider["id"], run: ChatProvider["run"]): ChatProvider {
  return { id, label: `Fake ${id}`, model: `${id}-model`, run };
}

const seen: ProviderRunInput[] = [];

async function collect(gen: AsyncGenerator<ChatStreamEvent>) {
  const events: ChatStreamEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

let cleanup: () => void;
beforeAll(() => {
  cleanup = setupTestEnvironment();
});
afterAll(() => cleanup());
beforeEach(() => {
  seen.length = 0;
  providers.fallback = null;
  providers.primary = fakeProvider("anthropic", async function* (input) {
    seen.push(input);
    yield { type: "text", delta: "Hallo " };
    yield { type: "text", delta: "Welt." };
    yield { type: "done", stopReason: "end_turn", model: "anthropic-model" };
  });
});

describe("runChatTurn", () => {
  it("speichert Frage und Antwort und streamt Ereignisse", async () => {
    const events = await collect(
      runChatTurn({ userId: "default", message: "Wie geht's?", mode: "text", signal: new AbortController().signal }),
    );
    const meta = events[0];
    expect(meta).toMatchObject({ type: "meta", isNewConversation: true, provider: "anthropic" });
    expect(events.filter((e) => e.type === "text").map((e) => (e as { delta: string }).delta).join("")).toBe(
      "Hallo Welt.",
    );
    expect(events.at(-1)).toMatchObject({ type: "done", stopReason: "end_turn", title: "Wie geht's?" });

    const conversationId = (meta as { conversationId: string }).conversationId;
    const stored = await listMessages(conversationId);
    expect(stored.map((m) => [m.role, m.content, m.status])).toEqual([
      ["user", "Wie geht's?", "complete"],
      ["assistant", "Hallo Welt.", "complete"],
    ]);
    expect(stored[1].meta).toMatchObject({ provider: "anthropic", model: "anthropic-model" });
  });

  it("übergibt Verlauf, System-Prompt und Werkzeuge an den Anbieter", async () => {
    const first = await collect(
      runChatTurn({ userId: "default", message: "Erste Frage", mode: "text", signal: new AbortController().signal }),
    );
    const conversationId = (first[0] as { conversationId: string }).conversationId;
    await collect(
      runChatTurn({
        userId: "default",
        conversationId,
        message: "Zweite Frage",
        mode: "voice",
        timezone: "Europe/Berlin",
        signal: new AbortController().signal,
      }),
    );
    const input = seen.at(-1)!;
    expect(input.history.map((m) => m.content)).toEqual(["Erste Frage", "Hallo Welt.", "Zweite Frage"]);
    expect(input.system.stable).toContain("J.A.R.V.I.S.");
    expect(input.system.dynamic).toContain("AUSGABEMODUS: SPRACHE");
    expect(input.system.dynamic).toContain("Europe/Berlin");
    expect(input.tools.map((t) => t.name)).toEqual(["forget_fact", "remember_fact", "search_memory"]);
  });

  it("wechselt bei einem Ausfall vor der ersten Ausgabe zum Fallback-Anbieter", async () => {
    providers.primary = fakeProvider("anthropic", async function* () {
      yield* [];
      throw new ProviderError("overloaded", "überlastet", { retryable: true });
    });
    providers.fallback = fakeProvider("openai", async function* () {
      yield { type: "text", delta: "Antwort vom Ersatz." };
      yield { type: "done", stopReason: "stop", model: "openai-model" };
    });
    const events = await collect(
      runChatTurn({ userId: "default", message: "Hallo?", mode: "text", signal: new AbortController().signal }),
    );
    expect(events.some((e) => e.type === "notice")).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: "done" });
    const stored = await listMessages((events[0] as { conversationId: string }).conversationId);
    expect(stored[1]).toMatchObject({ content: "Antwort vom Ersatz.", meta: { provider: "openai" } });
  });

  it("meldet Fehler und behält eine Teilantwort", async () => {
    providers.primary = fakeProvider("anthropic", async function* () {
      yield { type: "text", delta: "Ich beginne" };
      throw new ProviderError("network", "Keine Verbindung", { retryable: true });
    });
    const events = await collect(
      runChatTurn({ userId: "default", message: "Test", mode: "text", signal: new AbortController().signal }),
    );
    expect(events.at(-1)).toMatchObject({ type: "error", code: "network", retryable: true });
    const stored = await listMessages((events[0] as { conversationId: string }).conversationId);
    expect(stored[1]).toMatchObject({ content: "Ich beginne", status: "partial" });
  });

  it("speichert beim Abbruch die bisherige Antwort als 'partial'", async () => {
    const controller = new AbortController();
    providers.primary = fakeProvider("anthropic", async function* (input) {
      yield { type: "text", delta: "Teil eins" };
      controller.abort();
      await new Promise((r) => setTimeout(r, 5));
      if (input.signal.aborted) throw new ProviderError("aborted", "abgebrochen");
      yield { type: "text", delta: " – nie erreicht" };
    });
    const events = await collect(
      runChatTurn({ userId: "default", message: "Lang", mode: "text", signal: controller.signal }),
    );
    expect(events.at(-1)).toMatchObject({ type: "done", stopReason: "aborted" });
    const stored = await listMessages((events[0] as { conversationId: string }).conversationId);
    expect(stored[1]).toMatchObject({ content: "Teil eins", status: "partial" });
  });

  it("legt bei unbekannter Unterhaltung eine neue an", async () => {
    const events = await collect(
      runChatTurn({
        userId: "default",
        conversationId: "00000000-0000-4000-8000-000000000000",
        message: "Neu",
        mode: "text",
        signal: new AbortController().signal,
      }),
    );
    expect(events[0]).toMatchObject({ type: "meta", isNewConversation: true });
    expect((events[0] as { conversationId: string }).conversationId).not.toBe("00000000-0000-4000-8000-000000000000");
  });
});

describe("Hilfsfunktionen", () => {
  it("leitet kurze, saubere Titel ab", () => {
    expect(deriveTitle("**Wie** wird das `Wetter` morgen?")).toBe("Wie wird das Wetter morgen?");
    expect(deriveTitle("\n\n  erklär mir bitte ganz ausführlich wie Quantencomputer funktionieren und warum sie so schnell sind")).toMatch(
      /^Erklär mir bitte .+…$/,
    );
    expect(deriveTitle("   ")).toBe("Neue Unterhaltung");
  });

  it("baut den Verlauf innerhalb des Budgets und beginnt mit dem Nutzer", () => {
    const rows = [
      { role: "assistant" as const, content: "Begrüßung", status: "complete" as const },
      { role: "user" as const, content: "a".repeat(50), status: "complete" as const },
      { role: "assistant" as const, content: "b".repeat(50), status: "partial" as const },
      { role: "user" as const, content: "Letzte Frage", status: "complete" as const },
    ];
    const history = buildHistory(rows, 80);
    expect(history[0].role).toBe("user");
    expect(history.at(-1)?.content).toBe("Letzte Frage");
    // Führende Assistenten-Nachricht entfällt → Index 1 ist die unterbrochene Antwort.
    expect(buildHistory(rows)[1].content).toContain("[Antwort unterbrochen]");
  });
});
