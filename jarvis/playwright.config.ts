import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3210);
const AUTH_PORT = PORT + 1;
export const E2E_ACCESS_CODE = "e2e-zugang";

/** Datenbankdatei vor dem Start entfernen (plattformunabhängig). */
const resetDb = (file: string) =>
  `node -e "for (const s of ['','-wal','-shm']) require('fs').rmSync('${file}'+s,{force:true})"`;

/**
 * End-to-End-Tests gegen einen Produktions-Build im Demo-Modus.
 * Voraussetzung: `npm run build`. Es werden keine echten KI-APIs aufgerufen.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    {
      command: `${resetDb("data/e2e.db")} && npx next start -p ${PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        AI_PROVIDER: "demo",
        DATABASE_URL: "file:./data/e2e.db",
        JARVIS_ACCESS_CODE: "",
        RATE_LIMIT_PER_MINUTE: "1000",
        SKILL_WEATHER: "false",
      },
    },
    {
      command: `${resetDb("data/e2e-auth.db")} && npx next start -p ${AUTH_PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${AUTH_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        AI_PROVIDER: "demo",
        DATABASE_URL: "file:./data/e2e-auth.db",
        JARVIS_ACCESS_CODE: E2E_ACCESS_CODE,
        JARVIS_SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
        RATE_LIMIT_PER_MINUTE: "1000",
        SKILL_WEATHER: "false",
      },
    },
  ],
});
