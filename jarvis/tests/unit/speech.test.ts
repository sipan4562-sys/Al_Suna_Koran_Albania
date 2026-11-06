import { describe, expect, it } from "vitest";
import { SentenceChunker } from "@/lib/speech/sentences";
import { toSpeakable } from "@/lib/speech/speakable";
import { pickVoice, voiceScore } from "@/lib/speech/voices";

function streamThrough(chunker: SentenceChunker, text: string, step = 3): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += step) out.push(...chunker.push(text.slice(i, i + step)));
  out.push(...chunker.flush());
  return out;
}

describe("SentenceChunker", () => {
  it("liefert den ersten Satz, sobald er vollständig ist", () => {
    const chunker = new SentenceChunker();
    expect(chunker.push("Guten Abend. Wie")).toEqual(["Guten Abend."]);
    expect(chunker.push(" kann ich helfen?")).toEqual([]);
    expect(chunker.flush()).toEqual(["Wie kann ich helfen?"]);
  });

  it("trennt nicht an Abkürzungen und Ordinalzahlen", () => {
    const chunker = new SentenceChunker();
    const sentences = streamThrough(
      chunker,
      "Das Treffen ist am 3. Oktober um ca. 10 Uhr, z. B. im Büro. Danach geht es weiter.",
    );
    expect(sentences).toEqual([
      "Das Treffen ist am 3. Oktober um ca. 10 Uhr, z. B. im Büro.",
      "Danach geht es weiter.",
    ]);
  });

  it("überspringt Codeblöcke und kündigt sie einmal an", () => {
    const chunker = new SentenceChunker({ codeNotice: "Den Code zeige ich im Chat." });
    const sentences = streamThrough(
      chunker,
      "Hier ist die Funktion:\n```python\nprint('hi')\n```\nSie gibt hi aus.",
      5,
    );
    expect(sentences).toEqual(["Hier ist die Funktion:", "Den Code zeige ich im Chat.", "Sie gibt hi aus."]);
  });

  it("teilt sehr lange Sätze ohne Satzzeichen", () => {
    const chunker = new SentenceChunker({ maxChars: 80 });
    const long = `${"Wort ".repeat(30)}Ende`;
    const parts = streamThrough(chunker, long, 10);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join(" ").replace(/\s+/g, " ")).toBe(long);
  });

  it("trennt Listenpunkte", () => {
    const chunker = new SentenceChunker();
    expect(streamThrough(chunker, "Zutaten\n- Mehl\n- Zucker")).toEqual(["Zutaten", "- Mehl", "- Zucker"]);
  });
});

describe("toSpeakable", () => {
  it("entfernt Markdown und spricht Einheiten aus", () => {
    expect(toSpeakable("**Berlin:** 12 °C, Wind 14 km/h, Regen 80 % – [Quelle](https://x.y)")).toBe(
      "Berlin: 12 Grad, Wind 14 Kilometer pro Stunde, Regen 80 Prozent – Quelle",
    );
  });

  it("entfernt Codeblöcke, Emojis und Überschriften", () => {
    expect(toSpeakable("## Ergebnis 🚀\n```js\nx()\n```\nFertig & gut")).toBe("Ergebnis Fertig und gut");
  });
});

describe("Stimmenauswahl", () => {
  const voice = (name: string, lang: string, localService = true) =>
    ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;

  it("bevorzugt natürliche Stimmen der passenden Sprache", () => {
    const voices = [
      voice("Anna", "de-DE"),
      voice("Microsoft Conrad Online (Natural) - German (Germany)", "de-DE", false),
      voice("Samantha", "en-US"),
    ];
    expect(pickVoice(voices, "de-DE", null)?.name).toContain("Conrad");
    expect(voiceScore(voices[2], "de-DE")).toBe(-1);
  });

  it("respektiert eine explizit gewählte Stimme", () => {
    const voices = [voice("Anna", "de-DE"), voice("Google Deutsch", "de-DE", false)];
    expect(pickVoice(voices, "de-DE", "Anna")?.name).toBe("Anna");
  });
});
