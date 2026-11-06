import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Eigene Utilities bekannt machen, damit tailwind-merge sie nicht mit
// Tailwind-Gruppen verwechselt (z. B. `text-glow` ist keine Textfarbe).
const twMerge = extendTailwindMerge<"text-glow" | "glow-ring" | "glass">({
  extend: {
    classGroups: {
      "font-family": [{ font: ["display", "hud", "sans", "mono"] }],
      "text-glow": ["text-glow"],
      "glow-ring": ["glow-ring"],
      glass: ["glass", "glass-strong"],
    },
  },
});

/** Klassen zusammenführen; bei Konflikten (z. B. `hidden` vs. `inline-flex`) gewinnt die letzte. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
