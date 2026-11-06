/**
 * Wandelt (Markdown-)Text in gut vorlesbaren Klartext um: entfernt
 * Formatierung, Links, Emojis und spricht Einheiten aus.
 */
const UNIT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/(\d)\s?°C\b/g, "$1 Grad"],
  [/(\d)\s?°F\b/g, "$1 Grad Fahrenheit"],
  [/(\d)\s?°/g, "$1 Grad"],
  [/(\d)\s?km\/h\b/g, "$1 Kilometer pro Stunde"],
  [/(\d)\s?m\/s\b/g, "$1 Meter pro Sekunde"],
  [/(\d)\s?%/g, "$1 Prozent"],
  [/(\d)\s?mm\b/g, "$1 Millimeter"],
  [/(\d)\s?km\b/g, "$1 Kilometer"],
  [/(\d)\s?kg\b/g, "$1 Kilogramm"],
  [/(\d)\s?€/g, "$1 Euro"],
  [/€\s?(\d)/g, "$1 Euro"],
  [/\$\s?(\d[\d.,]*)/g, "$1 Dollar"],
];

export function toSpeakable(markdown: string): string {
  let text = markdown
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "Link")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+•]\s+/gm, "")
    .replace(/^\s*\|.*\|\s*$/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(\S(?:.*?\S)?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s*&\s*/g, " und ")
    .replace(/\s*->\s*/g, " zu ")
    .replace(/\s+/g, " ");
  for (const [pattern, replacement] of UNIT_REPLACEMENTS) text = text.replace(pattern, replacement);
  return text.trim();
}
