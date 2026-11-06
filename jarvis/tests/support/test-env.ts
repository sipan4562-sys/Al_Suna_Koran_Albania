import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resetEnvCache } from "@/server/config/env";
import { resetDbForTests } from "@/server/db/client";
import { resetProviderCache } from "@/server/ai/registry";
import { resetRateLimits } from "@/server/security/rate-limit";

/**
 * Isolierte Testumgebung: eigene SQLite-Datei pro Testdatei, Demo-Anbieter,
 * keine externen Dienste. Gibt eine Aufräumfunktion zurück.
 */
export function setupTestEnvironment(overrides: Record<string, string> = {}): () => void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-test-"));
  const previous = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: `file:${path.join(dir, "test.db")}`,
    AI_PROVIDER: "demo",
    ANTHROPIC_API_KEY: "",
    OPENAI_API_KEY: "",
    JARVIS_ACCESS_CODE: "",
    JARVIS_SESSION_SECRET: "",
    SKILL_WEATHER: "false",
    SKILL_MEMORY: "true",
    ...overrides,
  });
  resetEnvCache();
  resetDbForTests();
  resetProviderCache();
  resetRateLimits();

  return () => {
    resetDbForTests();
    process.env = previous;
    resetEnvCache();
    resetProviderCache();
    fs.rmSync(dir, { recursive: true, force: true });
  };
}
