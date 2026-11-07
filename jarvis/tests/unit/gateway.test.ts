import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { DEFAULT_PROFILE } from "@/lib/shared/types";
import { resolveGatewayToken } from "@/server/ai/gateway-auth";
import { createGatewayProvider, GATEWAY_MESSAGES } from "@/server/ai/providers/gateway";
import { getProviderSetup, requestCredentials } from "@/server/ai/registry";
import type { ProviderEvent, ProviderRunInput, ToolDefinition } from "@/server/ai/types";
import { scriptedFetch } from "../support/anthropic-sse";
import { setupTestEnvironment } from "../support/test-env";

const chunk = (delta: Record<string, unknown>, finish: string | null = null, model = "openai/gpt-5-mini") =>
  `data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", created: 1, model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;

const sse = (parts: string[]) =>
  new Response(parts.join("") + "data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });

const gatewayError = (status: number, type: string, message: string) =>
  new Response(JSON.stringify({ error: { message, type } }), {
    status,
    headers: { "content-type": "application/json" },
  });

const weather: ToolDefinition<{ location: string }> = {
  name: "get_weather",
  description: "Wetter",
  schema: z.object({ location: z.string().min(1) }),
  label: (i) => `Wetter: ${i.location}`,
  run: async ({ location }) => ({ ok: true, content: `{"ort":"${location}"}` }),
};

function runInput(overrides: Partial<ProviderRunInput> = {}): ProviderRunInput {
  const signal = new AbortController().signal;
  return {
    system: { stable: "Du bist JARVIS.", dynamic: "Jetzt" },
    history: [{ role: "user", content: "Hallo" }],
    tools: [weather],
    toolContext: { userId: "default", profile: DEFAULT_PROFILE, timezone: "Europe/Berlin", signal },
    mode: "text",
    signal,
    credentials: { gatewayToken: "oidc-token-123" },
    ...overrides,
  };
}

async function collect(gen: AsyncGenerator<ProviderEvent>) {
  const events: ProviderEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

const gateway = (fetchImpl: typeof fetch, fallbackModels = ["google/gemini-2.5-flash", "openai/gpt-5-mini"]) =>
  createGatewayProvider({
    model: "openai/gpt-5-mini",
    fallbackModels,
    effortText: "low",
    effortVoice: "minimal",
    fetch: fetchImpl,
  });

describe("Vercel AI Gateway", () => {
  it("meldet sich mit dem Token der Anfrage an und nutzt Ersatzmodelle", async () => {
    const { fetch, requests } = scriptedFetch([() => sse([chunk({ content: "Guten Abend." }), chunk({}, "stop")])]);
    const provider = gateway(fetch);
    expect(provider).toMatchObject({ id: "gateway", label: "Vercel AI Gateway", model: "openai/gpt-5-mini" });

    const events = await collect(provider.run(runInput({ mode: "voice" })));
    expect(events.map((e) => (e.type === "text" ? e.delta : "")).join("")).toBe("Guten Abend.");
    expect(events.at(-1)).toMatchObject({ type: "done", stopReason: "stop", model: "openai/gpt-5-mini" });

    const { url, headers, body } = requests[0];
    expect(url).toBe("https://ai-gateway.vercel.sh/v1/chat/completions");
    expect(headers.get("authorization")).toBe("Bearer oidc-token-123");
    expect(body).toMatchObject({
      model: "openai/gpt-5-mini",
      // Das Hauptmodell taucht nicht doppelt in der Ersatzliste auf.
      models: ["google/gemini-2.5-flash"],
      reasoning_effort: "minimal",
      stream: true,
    });
    expect(body).not.toHaveProperty("stream_options");
  });

  it("liest den Token bei jeder Anfrage neu und passt den Denkaufwand an", async () => {
    const { fetch, requests } = scriptedFetch([
      () => sse([chunk({ content: "Eins" }), chunk({}, "stop")]),
      () => sse([chunk({ content: "Zwei" }), chunk({}, "stop")]),
    ]);
    const provider = gateway(fetch, []);
    await collect(provider.run(runInput({ credentials: { gatewayToken: "token-a" } })));
    await collect(provider.run(runInput({ credentials: { gatewayToken: "token-b" } })));
    expect(requests.map((r) => r.headers.get("authorization"))).toEqual(["Bearer token-a", "Bearer token-b"]);
    expect(requests[0].body).toMatchObject({ reasoning_effort: "low" });
    expect(requests[0].body).not.toHaveProperty("models");
  });

  it("bricht ohne Token mit einem verständlichen Hinweis ab", async () => {
    const { fetch, requests } = scriptedFetch([]);
    await expect(collect(gateway(fetch).run(runInput({ credentials: {} })))).rejects.toMatchObject({
      code: "auth",
      message: GATEWAY_MESSAGES.missingToken,
    });
    expect(requests).toHaveLength(0);
  });

  it("erkennt leeres Guthaben (402) und abgelehnten Zugang (403)", async () => {
    const quota = scriptedFetch([() => gatewayError(402, "insufficient_funds", "Insufficient funds")]);
    await expect(collect(gateway(quota.fetch).run(runInput()))).rejects.toMatchObject({
      code: "quota",
      message: GATEWAY_MESSAGES.quota,
    });
    const denied = scriptedFetch([() => gatewayError(403, "forbidden", "Forbidden")]);
    await expect(collect(gateway(denied.fetch).run(runInput()))).rejects.toMatchObject({
      code: "auth",
      message: GATEWAY_MESSAGES.auth,
    });
  });

  it("erklärt, wenn das Gateway im Vercel-Team noch nicht freigeschaltet ist", async () => {
    const { fetch } = scriptedFetch([
      () =>
        gatewayError(
          403,
          "customer_verification_required",
          "AI Gateway requires a valid credit card on file to service requests.",
        ),
    ]);
    await expect(collect(gateway(fetch).run(runInput()))).rejects.toMatchObject({
      code: "not_configured",
      message: GATEWAY_MESSAGES.verification,
      retryable: false,
    });
  });
});

describe("Gateway-Zugang", () => {
  const contextKey = Symbol.for("@vercel/request-context");
  const globals = globalThis as Record<symbol, unknown>;
  let cleanup: () => void;

  beforeEach(() => {
    cleanup = setupTestEnvironment({ AI_PROVIDER: "auto", VERCEL: "1" });
  });
  afterEach(() => {
    delete globals[contextKey];
    cleanup();
  });

  it("nimmt den OIDC-Token aus Header, Vercel-Kontext oder lokaler Umgebung", () => {
    expect(resolveGatewayToken(new Headers())).toBeUndefined();

    process.env.VERCEL_OIDC_TOKEN = "lokal";
    expect(resolveGatewayToken(new Headers())).toBe("lokal");

    globals[contextKey] = { get: () => ({ headers: { "x-vercel-oidc-token": "kontext" } }) };
    expect(resolveGatewayToken(new Headers())).toBe("kontext");

    expect(resolveGatewayToken(new Headers({ "x-vercel-oidc-token": " header " }))).toBe("header");
  });

  it("bevorzugt einen gesetzten AI_GATEWAY_API_KEY", () => {
    cleanup();
    cleanup = setupTestEnvironment({ AI_PROVIDER: "auto", AI_GATEWAY_API_KEY: "vck_test" });
    expect(resolveGatewayToken(new Headers({ "x-vercel-oidc-token": "header" }))).toBe("vck_test");
    expect(getProviderSetup().primary.id).toBe("gateway");
  });

  it("wählt auf Vercel ohne Schlüssel das Gateway – mit Demo-Modus als Rückfallebene", () => {
    const setup = getProviderSetup();
    expect(setup.primary).toMatchObject({ id: "gateway", model: "openai/gpt-5-mini" });
    expect(setup.fallback?.id).toBe("demo");
    expect(setup.demo).toBe(false);
    expect(requestCredentials(new Headers({ "x-vercel-oidc-token": "abc" }))).toEqual({ gatewayToken: "abc" });
  });

  it("springt der Demo-Modus nur ein, fehlt der Hinweis auf API-Schlüssel", async () => {
    const fallback = getProviderSetup().fallback;
    expect(fallback?.id).toBe("demo");
    const events = await collect(fallback!.run(runInput({ tools: [], credentials: undefined })));
    const answer = events.map((e) => (e.type === "text" ? e.delta : "")).join("");
    expect(answer).toContain("Wie kann ich helfen?");
    expect(answer).not.toContain("Demo-Modus aktiv");
  });

  it("lässt eigene Schlüssel und Vorgaben Vorrang haben", () => {
    cleanup();
    cleanup = setupTestEnvironment({ AI_PROVIDER: "auto", VERCEL: "1", ANTHROPIC_API_KEY: "sk-ant-x" });
    expect(getProviderSetup().primary.id).toBe("anthropic");
    expect(requestCredentials(new Headers({ "x-vercel-oidc-token": "abc" }))).toEqual({});

    cleanup();
    cleanup = setupTestEnvironment({ AI_PROVIDER: "auto", VERCEL: "1", AI_FALLBACK_PROVIDER: "none" });
    expect(getProviderSetup().fallback).toBeNull();

    cleanup();
    cleanup = setupTestEnvironment({ AI_PROVIDER: "auto" });
    expect(getProviderSetup().primary.id).toBe("demo");
  });
});
