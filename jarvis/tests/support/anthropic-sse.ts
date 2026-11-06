/**
 * Hilfsfunktionen, um Antworten der Anthropic Messages API (SSE) für Tests
 * nachzubilden. So läuft der echte SDK-Code ohne Netzwerk und ohne Schlüssel.
 */

type Json = Record<string, unknown>;

export function sseResponse(events: Json[], status = 200): Response {
  const body = events.map((e) => `event: ${String(e.type)}\ndata: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(body, {
    status,
    headers: { "content-type": "text/event-stream", "request-id": "req_test" },
  });
}

export function errorResponse(status: number, type: string, message: string, extra: Json = {}): Response {
  return new Response(JSON.stringify({ type: "error", error: { type, message, ...extra } }), {
    status,
    headers: { "content-type": "application/json", "request-id": "req_test" },
  });
}

const messageStart = (model = "claude-opus-5-5"): Json => ({
  type: "message_start",
  message: {
    id: `msg_${Math.random().toString(36).slice(2)}`,
    type: "message",
    role: "assistant",
    model,
    content: [],
    stop_reason: null,
    stop_sequence: null,
    usage: { input_tokens: 42, output_tokens: 1 },
  },
});

const messageEnd = (stopReason: string, extraDelta: Json = {}): Json[] => [
  {
    type: "message_delta",
    delta: { stop_reason: stopReason, stop_sequence: null, ...extraDelta },
    usage: { output_tokens: 12 },
  },
  { type: "message_stop" },
];

export function textStream(chunks: string[], stopReason = "end_turn"): Json[] {
  return [
    messageStart(),
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    ...chunks.map((text) => ({
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text },
    })),
    { type: "content_block_stop", index: 0 },
    ...messageEnd(stopReason),
  ];
}

export function toolUseStream(id: string, name: string, inputJson: string): Json[] {
  return [
    messageStart(),
    // Opus 5.5 liefert Text zwischen Werkzeugaufrufen als (leeren) thinking-Block.
    {
      type: "content_block_start",
      index: 0,
      content_block: { type: "thinking", thinking: "", signature: "" },
    },
    { type: "content_block_delta", index: 0, delta: { type: "signature_delta", signature: "sig_test" } },
    { type: "content_block_stop", index: 0 },
    { type: "content_block_start", index: 1, content_block: { type: "tool_use", id, name, input: {} } },
    { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: inputJson } },
    { type: "content_block_stop", index: 1 },
    ...messageEnd("tool_use"),
  ];
}

export function refusalStream(): Json[] {
  return [messageStart(), ...messageEnd("refusal", { stop_details: { type: "refusal", category: "cyber", explanation: null } })];
}

/** fetch-Ersatz, der der Reihe nach vorbereitete Antworten liefert und Requests aufzeichnet. */
export function scriptedFetch(responses: Array<() => Response>) {
  const requests: Array<{ url: string; body: Json; headers: Headers }> = [];
  let index = 0;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = init?.body ? (JSON.parse(String(init.body)) as Json) : {};
    requests.push({ url, body, headers: new Headers(init?.headers) });
    const next = responses[index++];
    if (!next) throw new Error(`Unerwartete Anfrage Nr. ${index}`);
    return next();
  }) as typeof fetch;
  return { fetch: fetchImpl, requests };
}
