import "server-only";
import { formatNow } from "../prompt";
import { executeTool, safeLabel } from "../tools";
import {
  ProviderError,
  type ChatProvider,
  type ProviderEvent,
  type ProviderRunInput,
} from "../types";
import { USER_MESSAGES } from "../errors";

/**
 * Demo-Modus: funktioniert komplett ohne API-Schlüssel. Er beantwortet
 * einfache Anfragen regelbasiert, nutzt aber echte Skills (Wetter,
 * Gedächtnis) – so lassen sich Oberfläche, Streaming und Sprache testen,
 * bevor ein KI-Anbieter eingerichtet ist.
 */

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new ProviderError("aborted", USER_MESSAGES.aborted));
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new ProviderError("aborted", USER_MESSAGES.aborted));
      },
      { once: true },
    );
  });

const SETUP_HINT_TEXT =
  "\n\n> **Demo-Modus aktiv** – für echte KI-Antworten trage einen `ANTHROPIC_API_KEY` (oder `OPENAI_API_KEY`) " +
  "in `.env.local` ein und starte den Server neu.";

const SETUP_HINT_VOICE =
  " Hinweis: Ich laufe gerade im Demo-Modus. Für echte KI-Antworten hinterlege bitte einen API-Schlüssel.";

function greetingForHour(hour: number): string {
  if (hour < 5) return "Guten Abend";
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

function localHour(timezone: string): number {
  const hour = new Intl.DateTimeFormat("de-DE", { hour: "numeric", hourCycle: "h23", timeZone: timezone })
    .formatToParts(new Date())
    .find((p) => p.type === "hour")?.value;
  return Number(hour ?? 12);
}

/** Ortsangabe aus Sätzen wie "Wie ist das Wetter in Hamburg morgen?" ziehen. */
export function extractLocation(text: string): string | undefined {
  const match = text.match(
    /\b(?:in|für|fuer|bei|nach|at|for)\s+([A-ZÄÖÜ][\p{L}.'-]+(?:[\s-][A-ZÄÖÜ][\p{L}.'-]+){0,2})/u,
  );
  return match?.[1]?.replace(/[?.!,]+$/, "");
}

export function extractMemory(text: string): string | undefined {
  const match = text.match(/(?:merke?\s+dir|notiere|remember(?:\s+that)?)[,:]?\s+(?:dass\s+)?(.+)/i);
  return match?.[1]?.trim().replace(/[.!]+$/, "");
}

type Plan =
  | { kind: "text"; text: string }
  | { kind: "tool"; tool: string; input: Record<string, unknown>; render: (summary: string, ok: boolean) => string };

function plan(message: string, input: ProviderRunInput): Plan {
  const lower = message.toLowerCase();
  const voice = input.mode === "voice";
  const { profile } = input.toolContext;
  const name = profile.formOfAddress || profile.userName;
  const tz = input.toolContext.timezone;
  const has = (tool: string) => input.tools.some((t) => t.name === tool);

  if (/\b(wetter|temperatur|regen|regnet|schnee|weather|forecast)\b/.test(lower) && has("get_weather")) {
    const location = extractLocation(message);
    return {
      kind: "tool",
      tool: "get_weather",
      input: location ? { location, days: 2 } : { days: 2 },
      render: (summary, ok) =>
        ok
          ? voice
            ? `Laut Open-Meteo: ${summary.replace("°C", "Grad")}.`
            : `**Aktuelles Wetter** – ${summary}.\n\nDie Daten stammen live von Open-Meteo. Mit einem echten KI-Anbieter formuliere ich daraus eine ausführliche Vorhersage.`
          : `Das hat leider nicht geklappt: ${summary}.`,
    };
  }

  const fact = extractMemory(message);
  if (fact && has("remember_fact")) {
    return {
      kind: "tool",
      tool: "remember_fact",
      input: { fact },
      render: (summary, ok) =>
        ok ? `Verstanden – ich habe mir gemerkt: „${fact}“.` : `Das konnte ich mir nicht merken (${summary}).`,
    };
  }

  if (/\b(uhrzeit|wie spät|wie spaet|time is it|what time)\b/.test(lower)) {
    const time = new Intl.DateTimeFormat("de-DE", { timeStyle: "short", timeZone: tz }).format(new Date());
    return { kind: "text", text: `Es ist ${time} Uhr${name ? `, ${name}` : ""}.` };
  }

  if (/\b(datum|welcher tag|welches datum|today|heute)\b/.test(lower)) {
    return { kind: "text", text: `Heute ist ${formatNow(new Date(), tz, "de-DE")} Uhr.` };
  }

  if (/\b(witz|joke)\b/.test(lower)) {
    return {
      kind: "text",
      text: "Warum programmieren KI-Assistenten nachts? Weil tagsüber zu viele Menschen ihre Fragen mit „Nur kurz…“ beginnen.",
    };
  }

  if (/\b(code|beispiel|markdown|programm)\b/.test(lower) && !voice) {
    return {
      kind: "text",
      text:
        "Gern – hier ein kleines Beispiel, wie ich Code darstelle:\n\n" +
        "```python\ndef begruessung(name: str) -> str:\n    \"\"\"Gibt eine höfliche Begrüßung zurück.\"\"\"\n    return f\"Guten Tag, {name}. Alle Systeme sind bereit.\"\n\nprint(begruessung(\"Tony\"))\n```\n\n" +
        "| Fähigkeit | Status |\n|---|---|\n| Markdown & Tabellen | ✅ |\n| Syntax-Highlighting | ✅ |\n| Kopieren-Button | ✅ |",
    };
  }

  if (/\b(wer bist du|was kannst du|hilfe|help|who are you)\b/.test(lower)) {
    return {
      kind: "text",
      text: voice
        ? "Ich bin JARVIS, dein persönlicher Assistent. Im Demo-Modus kann ich die Uhrzeit nennen, Wetterdaten abrufen und mir Dinge merken."
        : "Ich bin **J.A.R.V.I.S.**, dein persönlicher KI-Assistent.\n\nIm Demo-Modus kann ich:\n- die **Uhrzeit** und das **Datum** nennen\n- echte **Wetterdaten** abrufen (z. B. „Wie ist das Wetter in Berlin?“)\n- mir **Fakten merken** („Merke dir, dass …“)\n- Markdown und **Code** darstellen",
    };
  }

  if (/\b(hallo|hi|hey|servus|moin|guten (morgen|tag|abend)|hello)\b/.test(lower)) {
    return {
      kind: "text",
      text: `${greetingForHour(localHour(tz))}${name ? `, ${name}` : ""}. Alle Systeme sind online. Wie kann ich helfen?`,
    };
  }

  return {
    kind: "text",
    text: voice
      ? "Das habe ich verstanden, aber im Demo-Modus kann ich darauf noch keine echte Antwort geben."
      : `Ich habe deine Nachricht erhalten:\n\n> ${message.slice(0, 400).replace(/\n/g, "\n> ")}\n\nIm Demo-Modus kann ich darauf noch nicht inhaltlich antworten.`,
  };
}

async function* streamWords(text: string, signal: AbortSignal): AsyncGenerator<ProviderEvent> {
  const tokens = text.match(/\S+\s*|\s+/g) ?? [text];
  for (const token of tokens) {
    await sleep(14 + Math.random() * 22, signal);
    yield { type: "text", delta: token };
  }
}

export interface DemoProviderOptions {
  /**
   * Hinweis „trage einen API-Schlüssel ein“ in der ersten Antwort. Aus, wenn der
   * Demo-Modus nur einspringt, weil der eigentliche Anbieter gerade ausfällt.
   */
  setupHint?: boolean;
}

export function createDemoProvider({ setupHint = true }: DemoProviderOptions = {}): ChatProvider {
  return {
    id: "demo",
    label: "Demo-Modus",
    model: "jarvis-demo",
    async *run(input: ProviderRunInput): AsyncGenerator<ProviderEvent, void, void> {
      const last = [...input.history].reverse().find((m) => m.role === "user");
      const message = last?.content ?? "";
      const voice = input.mode === "voice";
      await sleep(250, input.signal); // "denkt nach"

      const step = plan(message, input);
      let text: string;
      if (step.kind === "tool") {
        const tool = input.tools.find((t) => t.name === step.tool);
        const callId = `demo_${Date.now().toString(36)}`;
        yield {
          type: "tool",
          activity: {
            id: callId,
            name: step.tool,
            label: tool ? safeLabel(tool, step.input) : step.tool,
            status: "running",
          },
        };
        const execution = await executeTool(tool, step.tool, callId, step.input, input.toolContext);
        yield { type: "tool", activity: execution.activity };
        text = step.render(execution.activity.detail ?? "", execution.result.ok);
      } else {
        text = step.text;
      }

      // Hinweis nur in der ersten Antwort einer Unterhaltung, um nicht zu nerven.
      const firstAnswer = !input.history.some((m) => m.role === "assistant");
      if (firstAnswer && setupHint) text += voice ? SETUP_HINT_VOICE : SETUP_HINT_TEXT;
      yield* streamWords(text, input.signal);
      yield { type: "done", stopReason: "end_turn", model: "jarvis-demo" };
    },
  };
}
