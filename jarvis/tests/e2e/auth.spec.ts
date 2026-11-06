import { expect, test } from "@playwright/test";
import { E2E_ACCESS_CODE } from "../../playwright.config";

// Zweite Server-Instanz mit gesetztem JARVIS_ACCESS_CODE (siehe playwright.config.ts).
const AUTH_BASE = `http://127.0.0.1:${Number(process.env.E2E_PORT ?? 3210) + 1}`;

test.use({ baseURL: AUTH_BASE });

test("ohne Anmeldung: Umleitung zum Login und 401 für die API", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Zugang erforderlich")).toBeVisible();
  expect((await request.get("/api/status")).status()).toBe(401);
  expect((await request.get("/api/health")).status()).toBe(200);
});

test("falscher Code wird abgelehnt, richtiger Code entsperrt JARVIS", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("jarvis.booted", "1"));
  await page.goto("/login");
  await page.getByPlaceholder("Zugangscode").fill("falsch");
  await page.getByRole("button", { name: "Entsperren" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("nicht korrekt");

  await page.getByPlaceholder("Zugangscode").fill(E2E_ACCESS_CODE);
  await page.getByRole("button", { name: "Entsperren" }).click();
  await expect(page).toHaveURL(`${AUTH_BASE}/`);
  await expect(page.locator("#home-input")).toBeVisible();

  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === "jarvis_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  expect((await page.request.get("/api/status")).status()).toBe(200);

  // Bereits angemeldet: /login führt direkt zur Zentrale.
  await page.goto("/login");
  await expect(page).toHaveURL(`${AUTH_BASE}/`);
});
