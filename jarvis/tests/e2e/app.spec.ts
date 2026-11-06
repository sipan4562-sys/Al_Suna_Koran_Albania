import { expect, test, type Page } from "@playwright/test";

/** Start-Animation überspringen und Soundeffekte aus – einmalig pro Kontext. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("jarvis.booted", "1");
    if (!localStorage.getItem("jarvis.preferences.v1")) {
      localStorage.setItem("jarvis.preferences.v1", JSON.stringify({ sounds: false }));
    }
  });
});

async function openHome(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "J.A.R.V.I.S." }).first()).toContainText("Online");
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test("Hauptbildschirm zeigt Kern, Status und Bedienelemente", async ({ page }) => {
  await openHome(page);
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByText("Bereit", { exact: true })).toBeVisible();
  await expect(page.locator("#home-input")).toBeVisible();
  await expect(page.getByRole("button", { name: "Chat" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Spracheingabe/ })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("beantwortet eine Nachricht direkt auf dem Hauptbildschirm", async ({ page }) => {
  await openHome(page);
  await page.locator("#home-input").fill("Hallo JARVIS");
  await page.locator("#home-input").press("Enter");
  await expect(page.getByText(/Alle Systeme sind online/)).toBeVisible();
});

test("Chat zeigt Markdown, Codeblöcke und Tabellen", async ({ page }) => {
  await openHome(page);
  await page.getByRole("button", { name: "Chat" }).click();
  await expect(page.getByText("WIE KANN ICH HELFEN?")).toBeVisible();
  await page.locator("#chat-input").fill("Zeig mir ein Code Beispiel");
  await page.getByRole("button", { name: "Senden" }).click();

  const list = page.getByTestId("message-list");
  await expect(list.getByText("Zeig mir ein Code Beispiel")).toBeVisible();
  await expect(list.getByRole("button", { name: "Code kopieren" })).toBeVisible();
  await expect(list.locator("pre code")).toContainText("def begruessung");
  await expect(list.getByRole("table")).toBeVisible();
  await expect(list.getByRole("button", { name: "Antwort kopieren" })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("Zurück-Navigation führt vom Chat zur Zentrale", async ({ page }) => {
  await openHome(page);
  await page.getByRole("button", { name: "Chat" }).click();
  await expect(page.locator("#chat-input")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#home-input")).toBeVisible();
  await page.goForward();
  await expect(page.locator("#chat-input")).toBeVisible();
  await page.getByRole("button", { name: "Zurück zur Zentrale" }).click();
  await expect(page.locator("#home-input")).toBeVisible();
});

test("Verlauf: Unterhaltung wird gespeichert, umbenannt und gelöscht", async ({ page }) => {
  await openHome(page);
  await page.getByRole("button", { name: "Chat" }).click();
  await page.locator("#chat-input").fill("Was kannst du?");
  await page.getByRole("button", { name: "Senden" }).click();
  await expect(page.getByTestId("message-list").getByText(/Im Demo-Modus kann ich/)).toBeVisible();

  // Nach dem Neuladen ist die Unterhaltung weiterhin da.
  await page.reload();
  await page.getByRole("button", { name: "Verlauf" }).first().click();
  const drawer = page.getByRole("dialog", { name: "Verlauf" });
  await expect(drawer.getByText("Was kannst du?")).toBeVisible();

  await drawer.getByRole("button", { name: "„Was kannst du?“ umbenennen" }).click();
  await drawer.getByLabel("Neuer Titel").fill("Fähigkeiten");
  await drawer.getByRole("button", { name: "Titel speichern" }).click();
  await expect(drawer.getByText("Fähigkeiten")).toBeVisible();

  await drawer.getByRole("button", { name: "„Fähigkeiten“ löschen" }).click();
  await drawer.getByRole("button", { name: "Löschen", exact: true }).click();
  await expect(drawer.getByText("Fähigkeiten")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
});

test("Einstellungen werden dauerhaft gespeichert", async ({ page }) => {
  await openHome(page);
  await page.getByRole("button", { name: "Einstellungen" }).first().click();
  const panel = page.getByRole("dialog", { name: "Einstellungen" });
  await panel.getByLabel("Dein Name").fill("Tony");
  await panel.getByRole("radio", { name: /Humorvoll/ }).click();
  await expect
    .poll(async () => (await (await page.request.get("/api/profile")).json()).profile)
    .toMatchObject({ userName: "Tony", personality: "witty" });

  await page.reload();
  await expect(page.getByText(/, Tony\. Wie kann ich helfen\?/)).toBeVisible();
});

test("Gedächtnis: Fakten werden gespeichert und angezeigt", async ({ page }) => {
  await openHome(page);
  await page.locator("#home-input").fill("Merke dir, dass ich Espresso liebe");
  await page.locator("#home-input").press("Enter");
  await expect(page.getByText(/ich habe mir gemerkt/)).toBeVisible();
  await page.getByRole("button", { name: "Einstellungen" }).first().click();
  await expect(page.getByRole("dialog", { name: "Einstellungen" }).getByText("ich Espresso liebe")).toBeVisible();
});

test("Start-Sequenz erscheint einmal und lässt sich überspringen", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  const boot = page.getByTestId("boot-sequence");
  await expect(boot).toBeVisible();
  await boot.click();
  await expect(boot).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#home-input")).toBeVisible();
  await expect(boot).toHaveCount(0);
  await context.close();
});

test("ohne Zugangscode führt /login direkt zur Zentrale", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#home-input")).toBeVisible();
});

test("API weist ungültige Anfragen ab", async ({ request }) => {
  const empty = await request.post("/api/chat", { data: { message: "   " } });
  expect(empty.status()).toBe(400);
  const foreign = await request.post("/api/chat", {
    data: { message: "Hallo" },
    headers: { Origin: "https://evil.example" },
  });
  expect(foreign.status()).toBe(403);
  const missing = await request.get("/api/conversations/00000000-0000-4000-8000-000000000000");
  expect(missing.status()).toBe(404);
});
