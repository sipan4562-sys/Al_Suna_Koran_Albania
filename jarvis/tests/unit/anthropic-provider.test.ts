import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createAnthropicProvider, prepareAssistantEcho, resetAnthropicCompatibilityMode } from "@/server/ai/providers/anthropic";
import { ProviderError, type ProviderEvent, type ProviderRunInput, type ToolDefinition } from "@/server/ai/types";
import { DEFAULT_PROFILE } from "@/lib/shared/types";
import {
  errorResponse,
  refusalStream,
  scriptedFetch,
  sseResponse,
  textStream,
  toolUseStream,
} from "../support/anthropic-sse";

const weatherTool: ToolDefinition<{ location: string }> = {
  name: "get_weather",
  description: "Wetter abrufen",
  schema: z.object({ location: z.string().min(1) }),
  label: (input) => `Wetter: ${input.location ?? "?"}`,
  run: async (input) => ({ ok: true, content: JSON.stringify({ temp: 12, location: input.location }), summary: "12 °C" }),
};

function runInput(overrides: Partial<ProviderRunInput> = {}): ProviderRunInput {
  const signal = new AbortController().signal;
  return {
    system: { stable: "Du bist JARVIS.", dynamic: "Kontext: jetzt" },
    history: [{ role: "user", content: "Hallo" }],
    tools: [weatherTool],
    toolContext: { userId: "default", profile: DEFAULT_PROFILE, timezone: "Europe/Berlin", signal },
    mode: "text",
    signal,
    ...overrides,
  };
}

async function collect(gen: AsyncGenerator<ProviderEvent>): Promise<ProviderEvent[]> {
  const events: ProviderEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

const text = (events: ProviderEvent[]) =>
  events.map((e) => (e.type === "text" ? e.delta : "")).join("");

function provider(fetchImpl: typeof fetch, overrides: Record<string, unknown> = {}) {
  return createAnthropicProvider({
    apiKey: "sk-ant-test",
    model: "claude-opus-5-5",
    maxTokens: 32_000,
    effortText: "medium",
    effortVoice: "low",
    refusalFallback: true,
    webSearch: false,
    fetch: fetchImpl,
    ...overrides,
  });
}

afterEach(() => resetAnthropicCompatibilityMode());

describe("Anthropic-Provider", () => {
  it("streamt Text und sendet eine korrekte Anfrage", async () => {
    const { fetch, requests } = scriptedFetch([() => sseResponse(textStream(["Guten ", "Abend."]))]);
    const events = await collect(provider(fetch).run(runInput({ mode: "voice" })));

    expect(text(events)).toBe("Guten Abend.");
    expect(events.at(-1)).toMatchObject({ type: "done", stopReason: "end_turn", model: "claude-opus-5-5" });

    const { body, headers, url } = requests[0];
    expect(url).toContain("/v1/messages");
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.stream).toBe(true);
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("thinking");
    expect(body.output_config).toEqual({ effort: "low" });
    expect(body.fallbacks).toBe("default");
    expect(headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(body.system).toEqual([
      { type: "text", text: "Du bist JARVIS.", cache_control: { type: "ephemeral" } },
      { type: "text", text: "Kontext: jetzt" },
    ]);
    const tools = body.tools as Array<Record<string, unknown>>;
    expect(tools[0]).toMatchObject({ name: "get_weather", eager_input_streaming: true });
    expect(tools[0].input_schema).toMatchObject({ type: "object", required: ["location"] });
  });

  it("führt Werkzeuge aus und setzt die Antwort fort", async () => {
    const { fetch, requests } = scriptedFetch([
      () => sseResponse(toolUseStream("toolu_1", "get_weather", '{"location": "Berlin"}')),
      () => sseResponse(textStream(["In Berlin sind es 12 Grad."])),
    ]);
    const events = await collect(provider(fetch).run(runInput()));

    const tools = events.filter((e) => e.type === "tool");
    expect(tools.map((e) => e.type === "tool" && e.activity.status)).toEqual(["running", "success"]);
    expect(text(events)).toBe("In Berlin sind es 12 Grad.");

    const second = requests[1].body.messages as Array<{ role: string; content: unknown }>;
    expect(second).toHaveLength(3);
    // Der Assistenten-Turn (inkl. thinking-Block) wird unverändert zurückgesendet.
    const assistant = second[1].content as Array<{ type: string }>;
    expect(assistant.map((b) => b.type)).toEqual(["thinking", "tool_use"]);
    expect(second[2]).toMatchObject({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "toolu_1" }],
    });
    const result = (second[2].content as Array<{ content: string }>)[0].content;
    expect(JSON.parse(result)).toEqual({ temp: 12, location: "Berlin" });
    // System-Prompt bleibt innerhalb eines Turns byte-identisch.
    expect(requests[1].body.system).toEqual(requests[0].body.system);
  });

  it("meldet ungültige Werkzeug-Eingaben als Fehlerergebnis an das Modell", async () => {
    const { fetch, requests } = scriptedFetch([
      () => sseResponse(toolUseStream("toolu_2", "get_weather", '{"location": ""}')),
      () => sseResponse(textStream(["Welcher Ort?"])),
    ]);
    await collect(provider(fetch).run(runInput()));
    const toolResult = (requests[1].body.messages as Array<{ content: unknown }>)[2].content as Array<Record<string, unknown>>;
    expect(toolResult[0].is_error).toBe(true);
    expect(String(toolResult[0].content)).toContain("INVALID_INPUT");
  });

  it("behandelt Ablehnungen (refusal) höflich", async () => {
    const { fetch } = scriptedFetch([() => sseResponse(refusalStream())]);
    const events = await collect(provider(fetch).run(runInput()));
    expect(text(events)).toContain("nicht helfen");
    expect(events.at(-1)).toMatchObject({ type: "done", stopReason: "refusal" });
  });

  it("wiederholt bei 400 einmal ohne optionale Funktionen", async () => {
    const { fetch, requests } = scriptedFetch([
      () => errorResponse(400, "invalid_request_error", "Unexpected value(s) for the anthropic-beta header."),
      () => sseResponse(textStream(["OK"])),
    ]);
    const events = await collect(provider(fetch).run(runInput()));
    expect(text(events)).toBe("OK");
    const retry = requests[1];
    expect(retry.body).not.toHaveProperty("fallbacks");
    expect(retry.body).not.toHaveProperty("output_config");
    expect(retry.headers.get("anthropic-beta")).toBeNull();
    expect((retry.body.tools as Array<Record<string, unknown>>)[0]).not.toHaveProperty("eager_input_streaming");
  });

  it("bildet Authentifizierungsfehler auf 'auth' ab", async () => {
    const { fetch } = scriptedFetch([() => errorResponse(401, "authentication_error", "invalid x-api-key")]);
    await expect(collect(provider(fetch).run(runInput()))).rejects.toMatchObject({
      code: "auth",
      retryable: false,
    });
  });

  it("meldet Überlastung nach den SDK-Wiederholungen als 'overloaded'", async () => {
    const overloaded = () => {
      const response = errorResponse(529, "overloaded_error", "Overloaded");
      response.headers.set("retry-after-ms", "1");
      return response;
    };
    const { fetch, requests } = scriptedFetch([overloaded, overloaded, overloaded]);
    const error = await collect(provider(fetch).run(runInput())).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ code: "overloaded", retryable: true });
    expect(requests).toHaveLength(3); // 1 Versuch + 2 Wiederholungen
  });

  it("entfernt nach einem Fallback-Wechsel thinking/tool_use vor der Grenze", () => {
    const echo = prepareAssistantEcho([
      { type: "thinking", thinking: "", signature: "a" },
      { type: "text", text: "Teil 1", citations: null },
      { type: "fallback", from: { model: "claude-opus-5-5" }, to: { model: "claude-opus-5" } },
      { type: "text", text: "Teil 2", citations: null },
    ] as never);
    expect(echo.map((b) => b.type)).toEqual(["text", "text"]);
  });
});
