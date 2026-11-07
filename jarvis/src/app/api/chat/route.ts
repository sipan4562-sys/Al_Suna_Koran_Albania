import { runChatTurn } from "@/server/ai/orchestrator";
import { USER_MESSAGES } from "@/server/ai/errors";
import { requestCredentials } from "@/server/ai/registry";
import { getEnv } from "@/server/config/env";
import { api, jsonError, payloadErrorResponse, readJson } from "@/server/http/api";
import { ChatRequestSchema, firstIssue } from "@/server/validation";
import type { ChatStreamEvent } from "@/lib/shared/types";

// Lange Antworten inkl. Werkzeugaufrufen brauchen Zeit (Serverless-Limit).
export const maxDuration = 300;

const encoder = new TextEncoder();
const encode = (event: ChatStreamEvent) => encoder.encode(`${JSON.stringify(event)}\n`);

/**
 * POST /api/chat – streamt die Antwort als NDJSON (eine JSON-Zeile pro
 * Ereignis: meta, text, tool, notice, done | error).
 */
export const POST = api(
  async (request, { userId }) => {
    let body: unknown;
    try {
      body = await readJson(request);
    } catch (error) {
      return payloadErrorResponse(error) ?? jsonError(400, "bad_request", "Ungültige Anfrage.");
    }
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request", firstIssue(parsed.error));

    // Bricht der Browser ab (Stopp-Button, Tab geschlossen), wird auch die KI-Anfrage beendet.
    const abort = new AbortController();
    request.signal.addEventListener("abort", () => abort.abort(), { once: true });

    const turn = runChatTurn({
      userId,
      conversationId: parsed.data.conversationId,
      message: parsed.data.message,
      mode: parsed.data.mode,
      timezone: parsed.data.timezone,
      signal: abort.signal,
      // Jetzt lesen, solange der Anfragekontext sicher besteht (OIDC-Token der Vercel-Funktion).
      credentials: requestCredentials(request.headers),
    });

    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { value, done } = await turn.next();
          if (cancelled) return; // Client ist weg – der Turn speichert trotzdem.
          if (done) {
            controller.close();
            return;
          }
          controller.enqueue(encode(value));
        } catch (error) {
          if (cancelled) return;
          console.error("[jarvis] Chat-Stream fehlgeschlagen:", error);
          controller.enqueue(
            encode({ type: "error", code: "internal", message: USER_MESSAGES.internal, retryable: true }),
          );
          controller.close();
        }
      },
      async cancel() {
        cancelled = true;
        abort.abort();
        // Generator zu Ende laufen lassen, damit die Teilantwort gespeichert wird.
        await turn.return(undefined).catch(() => undefined);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  },
  { rateLimit: { bucket: "chat", limit: getEnv().RATE_LIMIT_PER_MINUTE } },
);
