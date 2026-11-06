import "server-only";
import { z } from "zod";
import type { ToolActivity } from "@/lib/shared/types";
import type { AnyToolDefinition, ToolContext, ToolResult } from "./types";

export interface JsonObjectSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

const schemaCache = new WeakMap<AnyToolDefinition, JsonObjectSchema>();

/** Zod-Schema → JSON-Schema für die Tool-Definitionen der KI-Anbieter. */
export function toolJsonSchema(tool: AnyToolDefinition): JsonObjectSchema {
  const cached = schemaCache.get(tool);
  if (cached) return cached;
  const generated = z.toJSONSchema(tool.schema, { target: "draft-2020-12" }) as Record<string, unknown>;
  delete generated.$schema;
  const schema: JsonObjectSchema = {
    ...generated,
    type: "object",
    properties: (generated.properties as Record<string, unknown> | undefined) ?? {},
  };
  schemaCache.set(tool, schema);
  return schema;
}

const MAX_TOOL_OUTPUT_CHARS = 20_000;

export interface ToolExecution {
  activity: ToolActivity;
  result: ToolResult;
}

/**
 * Validiert die vom Modell gelieferte Eingabe (die Eingabe ist nicht
 * vertrauenswürdig!) und führt das Werkzeug aus. Fehler werden nie geworfen,
 * sondern als Fehlerergebnis an das Modell zurückgegeben.
 */
export async function executeTool(
  tool: AnyToolDefinition | undefined,
  name: string,
  callId: string,
  rawInput: unknown,
  ctx: ToolContext,
): Promise<ToolExecution> {
  if (!tool) {
    return {
      activity: { id: callId, name, label: name, status: "error", detail: "Unbekanntes Werkzeug" },
      result: { ok: false, content: JSON.stringify({ error: `Unknown tool: ${name}` }) },
    };
  }

  const parsed = tool.schema.safeParse(rawInput ?? {});
  const label = safeLabel(tool, parsed.success ? parsed.data : rawInput);
  if (!parsed.success) {
    return {
      activity: { id: callId, name, label, status: "error", detail: "Ungültige Eingabe" },
      result: {
        ok: false,
        content: JSON.stringify({
          INVALID_INPUT: JSON.stringify(rawInput ?? null),
          issues: parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`),
        }),
      },
    };
  }

  try {
    const result = await tool.run(parsed.data, ctx);
    return {
      activity: {
        id: callId,
        name,
        label,
        status: result.ok ? "success" : "error",
        detail: result.summary,
      },
      result: { ...result, content: truncate(result.content) },
    };
  } catch (error) {
    if (ctx.signal.aborted) throw error;
    console.error(`[jarvis] Werkzeug "${name}" fehlgeschlagen:`, error);
    return {
      activity: { id: callId, name, label, status: "error", detail: "Werkzeug-Fehler" },
      result: {
        ok: false,
        content: JSON.stringify({ error: "The tool failed unexpectedly. Tell the user briefly." }),
      },
    };
  }
}

export function safeLabel(tool: AnyToolDefinition, input: unknown): string {
  try {
    return tool.label((input ?? {}) as Record<string, unknown>);
  } catch {
    return tool.name;
  }
}

function truncate(text: string): string {
  return text.length > MAX_TOOL_OUTPUT_CHARS ? `${text.slice(0, MAX_TOOL_OUTPUT_CHARS)}…` : text;
}
