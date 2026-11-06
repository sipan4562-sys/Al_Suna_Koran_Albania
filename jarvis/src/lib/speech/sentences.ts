/**
 * Zerlegt einen gestreamten Antworttext inkrementell in sprechbare Sätze.
 * So kann JARVIS schon nach dem ersten Satz zu sprechen beginnen, während
 * der Rest der Antwort noch übertragen wird.
 */

const ABBREVIATIONS = new Set([
  "z.b",
  "z. b",
  "d.h",
  "d. h",
  "u.a",
  "u. a",
  "bzw",
  "ca",
  "usw",
  "etc",
  "evtl",
  "ggf",
  "inkl",
  "vgl",
  "dr",
  "prof",
  "nr",
  "str",
  "mio",
  "mrd",
  "st",
  "vs",
  "e.g",
  "i.e",
  "mr",
  "mrs",
  "ms",
  "jan",
  "feb",
  "okt",
  "nov",
  "dez",
]);

/** Liegt der Punkt an Position `index` am Ende einer Abkürzung oder Zahl? */
function isFalseBoundary(text: string, index: number): boolean {
  if (text[index] !== ".") return false;
  const before = text.slice(Math.max(0, index - 6), index).toLowerCase();
  const word = before.split(/\s+/).pop() ?? "";
  if (ABBREVIATIONS.has(word) || ABBREVIATIONS.has(before.trim().slice(-4))) return true;
  // Einzelbuchstaben ("A. Müller") und Ordinalzahlen ("3. Oktober")
  if (/(^|\s)(\p{L}|\d{1,2})$/u.test(before)) return true;
  return false;
}

export class SentenceChunker {
  private buffer = "";
  private inCode = false;
  private codeAnnounced = false;
  private emittedAny = false;

  constructor(
    private readonly options: { maxChars?: number; codeNotice?: string } = {},
  ) {}

  /** Neuen Text anhängen, fertige Sätze zurückgeben. */
  push(delta: string): string[] {
    this.buffer += delta;
    return this.extract(false);
  }

  /** Restlichen Text am Ende der Antwort ausgeben. */
  flush(): string[] {
    return this.extract(true);
  }

  reset() {
    this.buffer = "";
    this.inCode = false;
    this.codeAnnounced = false;
    this.emittedAny = false;
  }

  private extract(final: boolean): string[] {
    const out: string[] = [];
    const maxChars = this.options.maxChars ?? 220;

    while (this.buffer.length > 0) {
      // Codeblöcke werden nicht vorgelesen.
      if (this.inCode) {
        const end = this.buffer.indexOf("```");
        if (end === -1) {
          if (final) this.buffer = "";
          // Nur den letzten Teil behalten, falls dort das Ende-Fence beginnt.
          else this.buffer = this.buffer.slice(-2);
          break;
        }
        this.buffer = this.buffer.slice(end + 3).replace(/^[^\n]*\n?/, "");
        this.inCode = false;
        continue;
      }

      const fence = this.buffer.indexOf("```");
      const searchable = fence === -1 ? this.buffer : this.buffer.slice(0, fence);
      const boundary = this.findBoundary(searchable, maxChars);

      if (boundary !== -1) {
        out.push(this.buffer.slice(0, boundary));
        this.buffer = this.buffer.slice(boundary);
        continue;
      }
      if (fence !== -1) {
        if (searchable.trim()) out.push(searchable);
        this.buffer = this.buffer.slice(fence + 3);
        this.inCode = true;
        if (!this.codeAnnounced && this.options.codeNotice) {
          out.push(this.options.codeNotice);
          this.codeAnnounced = true;
        }
        continue;
      }
      if (final) {
        out.push(this.buffer);
        this.buffer = "";
      }
      break;
    }

    const cleaned = out.map((s) => s.trim()).filter((s) => /[\p{L}\p{N}]/u.test(s));
    if (cleaned.length) this.emittedAny = true;
    return cleaned;
  }

  /** Index direkt nach dem Satzende oder -1. */
  private findBoundary(text: string, maxChars: number): number {
    // Der allererste Satz darf kurz sein – möglichst schnell zu sprechen beginnen.
    const minLength = this.emittedAny ? 12 : 2;
    const pattern = /([.!?…]+["'»«”)\]]*)(\s+)|(\n\s*\n)|(\n(?=\s*(?:[-*•]|\d+[.)])\s))/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const end = match.index + match[0].length;
      if (match[1]) {
        if (isFalseBoundary(text, match.index + match[1].length - 1)) continue;
        // Mindestlänge nur für Satzzeichen – Absätze/Listenpunkte trennen immer.
        if (match.index + 1 < minLength) continue;
      }
      return end;
    }
    // Sehr lange Sätze ohne Satzzeichen an einem Komma/Doppelpunkt teilen.
    if (text.length > maxChars) {
      const cut = Math.max(text.lastIndexOf(", ", maxChars), text.lastIndexOf(": ", maxChars), text.lastIndexOf("; ", maxChars));
      if (cut > 40) return cut + 2;
      const space = text.lastIndexOf(" ", maxChars);
      if (space > 40) return space + 1;
    }
    return -1;
  }
}
