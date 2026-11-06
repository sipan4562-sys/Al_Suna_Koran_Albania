import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DEFAULT_PROFILE } from "@/lib/shared/types";
import { createOpenAIProvider } from "@/server/ai/providers/openai";
import type { ProviderEvent, ToolDefinition } from "@/server/ai/types";

const chunk = (delta: Record<string, unknown>, finish: string | null = null) =>
  `data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", created: 1, model: "gpt-test", choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;

const sse = (parts: string[]) =>
  new Response(parts.join("") + "data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });

const tool: ToolDefinition<{ location: string }> = {
  name: "get_weather",
  description: "Wetter",
  schema: z.object({ location: z.string().min(1) }),
  label: (i) => `Wetter: ${i.location}`,
  run: async ({ location }) => ({ ok: true, content: `{"ort":"${location}","temp":9}`, summary: "9 °C" }),
};

describe("OpenAI-Provider", () => {
  it("setzt gestreamte Tool-Calls zusammen und setzt die Antwort fort", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const responses = [
      () =>
        sse([
          chunk({ role: "assistant", tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "get_weather", arguments: "" } }] }),
          chunk({ tool_calls: [{ index: 0, function: { arguments: '{"location":' } }] }),
          chunk({ tool_calls: [{ index: 0, function: { arguments: '"Berlin"}' } }] }),
          chunk({}, "tool_calls"),
        ]),
      () => sse([chunk({ content: "In Berlin " }), chunk({ content: "sind es 9 Grad." }), chunk({}, "stop")]),
    ];
    let index = 0;
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return responses[index++]();
    }) as typeof fetch;

    const provider = createOpenAIProvider({ apiKey: "sk-test", model: "gpt-test", fetch: fetchImpl });
    const signal = new AbortController().signal;
    const events: ProviderEvent[] = [];
    for await (const event of provider.run({
      system: { stable: "JARVIS", dynamic: "jetzt" },
      history: [{ role: "user", content: "Wetter Berlin?" }],
      tools: [tool],
      toolContext: { userId: "default", profile: DEFAULT_PROFILE, timezone: "Europe/Berlin", signal },
      mode: "text",
      signal,
    })) {
      events.push(event);
    }

    expect(events.filter((e) => e.type === "tool").map((e) => e.type === "tool" && e.activity.status)).toEqual([
      "running",
      "success",
    ]);
    expect(events.map((e) => (e.type === "text" ? e.delta : "")).join("")).toBe("In Berlin sind es 9 Grad.");
    expect(events.at(-1)).toMatchObject({ type: "done", stopReason: "stop" });

    const second = bodies[1].messages as Array<Record<string, unknown>>;
    expect(second[0]).toMatchObject({ role: "system", content: "JARVIS\n\njetzt" });
    expect(second[2]).toMatchObject({ role: "assistant", tool_calls: [{ id: "call_1", function: { name: "get_weather", arguments: '{"location":"Berlin"}' } }] });
    expect(second[3]).toMatchObject({ role: "tool", tool_call_id: "call_1", content: '{"ort":"Berlin","temp":9}' });
    expect((bodies[0].tools as unknown[]).length).toBe(1);
  });

  it("bildet 401 auf einen Authentifizierungsfehler ab", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ error: { message: "bad key", type: "invalid_request_error" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;
    const provider = createOpenAIProvider({ apiKey: "sk-bad", model: "gpt-test", fetch: fetchImpl });
    const signal = new AbortController().signal;
    const run = async () => {
      const events = provider.run({
        system: { stable: "", dynamic: "" },
        history: [{ role: "user", content: "Hi" }],
        tools: [],
        toolContext: { userId: "default", profile: DEFAULT_PROFILE, timezone: "UTC", signal },
        mode: "text",
        signal,
      });
      while (!(await events.next()).done) {
        // Ereignisse verwerfen
      }
    };
    await expect(run()).rejects.toMatchObject({ code: "auth" });
  });
});
