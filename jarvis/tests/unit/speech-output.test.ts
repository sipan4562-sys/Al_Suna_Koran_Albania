import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Testet die Sprachausgabe-Warteschlange mit nachgebildeten Browser-APIs
 * (speechSynthesis, <audio>, fetch) – ohne echten Browser.
 */

interface FakeUtterance {
  text: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onboundary: (() => void) | null;
}

const spoken: string[] = [];
const played: string[] = [];
let pendingUtterance: FakeUtterance | null = null;

const synth = {
  paused: false,
  speaking: false,
  getVoices: () => [],
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  resume: () => undefined,
  cancel: vi.fn(() => {
    const current = pendingUtterance;
    pendingUtterance = null;
    current?.onend?.();
  }),
  speak(utterance: FakeUtterance) {
    spoken.push(utterance.text);
    pendingUtterance = utterance;
    setTimeout(() => {
      if (pendingUtterance === utterance) {
        pendingUtterance = null;
        utterance.onend?.();
      }
    }, 5);
  },
};

class FakeAudio {
  src = "";
  volume = 1;
  playbackRate = 1;
  preload = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  setAttribute() {}
  pause() {}
  play() {
    played.push(this.src);
    setTimeout(() => this.onended?.(), 5);
    return Promise.resolve();
  }
}

beforeEach(() => {
  spoken.length = 0;
  played.length = 0;
  pendingUtterance = null;
  vi.stubGlobal("window", {
    speechSynthesis: synth,
    SpeechSynthesisUtterance: class {},
    matchMedia: () => ({ matches: false }),
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      onend = null;
      onerror = null;
      onboundary = null;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("requestAnimationFrame", (cb: () => void) => setTimeout(cb, 16) as unknown as number);
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function createOutput(engine: "browser" | "server") {
  const { SpeechOutput } = await import("@/lib/speech/output");
  const events: string[] = [];
  const output = new SpeechOutput({
    getSettings: () => ({ engine, lang: "de-DE", voiceURI: null, rate: 1, pitch: 1, volume: 1 }),
    onSpeakingChange: (speaking) => events.push(speaking ? "start" : "stop"),
    onFinished: () => events.push("finished"),
  });
  return { output, events };
}

const waitFor = async (check: () => boolean, timeout = 2000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error("Zeitüberschreitung");
    await new Promise((r) => setTimeout(r, 5));
  }
};

describe("SpeechOutput", () => {
  it("spricht gestreamte Sätze in Reihenfolge und meldet das Ende", async () => {
    const { output, events } = await createOutput("browser");
    output.begin();
    output.push("Guten Abend. Wie ");
    output.push("kann ich **helfen**? Gern");
    output.push(" geschehen.");
    output.end();
    await waitFor(() => events.includes("finished"));
    expect(spoken).toEqual(["Guten Abend.", "Wie kann ich helfen?", "Gern geschehen."]);
    expect(events).toEqual(["start", "stop", "finished"]);
  });

  it("bricht bei stop() sofort ab, ohne 'finished' zu melden", async () => {
    const { output, events } = await createOutput("browser");
    output.begin();
    output.push("Erster Satz. Zweiter Satz. Dritter Satz.");
    await waitFor(() => spoken.length === 1);
    output.stop();
    await new Promise((r) => setTimeout(r, 40));
    expect(synth.cancel).toHaveBeenCalled();
    expect(spoken.length).toBeLessThan(3);
    expect(events).toContain("stop");
    expect(events).not.toContain("finished");
  });

  it("meldet 'finished' auch, wenn es nichts zu sprechen gab", async () => {
    const { output, events } = await createOutput("browser");
    output.begin();
    output.push("```js\nconsole.log(1)\n```");
    output.end();
    await waitFor(() => events.includes("finished"));
    expect(spoken).toEqual(["Den Code habe ich dir im Chat angezeigt."]);
  });

  it("lädt Server-Audio vorab und spielt es nacheinander ab", async () => {
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        requests.push(JSON.parse(String(init.body)).text);
        return new Response(new Blob(["mp3"], { type: "audio/mpeg" }));
      }),
    );
    const { output, events } = await createOutput("server");
    output.begin();
    output.push("Satz eins. Satz zwei. Satz drei.");
    // Vorab-Laden: mehrere Anfragen, bevor das erste Audio fertig ist.
    await waitFor(() => requests.length >= 2);
    output.end();
    await waitFor(() => events.includes("finished"));
    expect(requests).toEqual(["Satz eins.", "Satz zwei.", "Satz drei."]);
    expect(played).toHaveLength(3);
    expect(spoken).toHaveLength(0);
  });

  it("fällt bei Serverfehlern auf die Browser-Stimme zurück", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 502 })));
    const { output, events } = await createOutput("server");
    output.speak("Hallo Welt.");
    await waitFor(() => events.includes("finished"));
    expect(played).toHaveLength(0);
    expect(spoken).toEqual(["Hallo Welt."]);
  });
});
