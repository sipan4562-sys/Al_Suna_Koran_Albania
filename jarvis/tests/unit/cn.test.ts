import { expect, it } from "vitest";
import { cn } from "@/lib/client/cn";
it("merge", () => {
  expect(cn("text-arc-soft text-glow")).toBe("text-arc-soft text-glow");
  expect(cn("inline-flex", "hidden sm:inline-flex")).toBe("hidden sm:inline-flex");
  expect(cn("text-sm text-ink", "text-alert")).toBe("text-sm text-alert");
  expect(cn("font-display text-base", "font-hud")).toBe("text-base font-hud");
  expect(cn("glass", "glass-strong")).toBe("glass-strong");
});
