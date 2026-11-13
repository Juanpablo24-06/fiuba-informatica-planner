import { expect, test, type Page } from "@playwright/test";
import { loginAsDemo } from "./fixtures";

async function openCalendar(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.route("**/api/planner**", (route) => route.fulfill({ json: { scenarios: [], entries: [], offers: [] } }));
  await loginAsDemo(page, "/calendario");
  await expect(page.locator('[data-workspace-ready="true"]')).toBeVisible({ timeout: 30_000 });
  const prompt = page.getByRole("heading", { name: "Elegí dónde vas a trabajar" });
  if (await prompt.isVisible()) await prompt.locator("..").getByRole("button").first().click();
  await expect(prompt).not.toBeVisible();
  await expect(page.locator('[data-calendar-month="true"]')).toBeVisible();
}

const calendarIcon = (page: Page) => page.locator('[data-navigation-icon="/calendario"]:visible');

test("header icons retain their gestures and calendar page follows month changes", async ({ page }) => {
  await openCalendar(page);
  const icon = calendarIcon(page);
  const heading = page.getByRole("heading", { level: 1 });
  const originalMonth = await heading.textContent();
  await page.getByRole("button", { name: "Mes siguiente", exact: true }).last().click();
  await expect(heading).not.toHaveText(originalMonth!);
  await expect.poll(() => icon.evaluate((root) => root.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
  await expect.poll(() => icon.evaluate((root) => root.getAnimations({ subtree: true }).length)).toBe(0);
  await page.locator('header a[href="/cursos"]:visible').focus();
  await expect(page.locator('header a[href="/cursos"]:visible')).toBeFocused();
  await expect.poll(() => page.locator('header a[href="/cursos"]:visible').evaluate((root) => root.getAnimations({ subtree: true }).length)).toBe(0);
});

test("header feedback respects reduced motion, including a live preference change", async ({ page }) => {
  await openCalendar(page);
  const icon = calendarIcon(page);
  await page.locator('header a[href="/calendario"]:visible').focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => icon.evaluate((root) => root.getAnimations({ subtree: true }).length)).toBe(0);
  const heading = page.getByRole("heading", { level: 1 });
  const month = await heading.textContent();
  await page.getByRole("button", { name: "Mes siguiente", exact: true }).last().click();
  await expect(heading).not.toHaveText(month!);
  await page.locator('header a[href="/cursos"]:visible').focus();
  await page.getByRole("button", { name: /Cambiar a modo/ }).click();
  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await expect.poll(() => page.locator("header").first().evaluate((root) => root.getAnimations({ subtree: true }).length)).toBe(0);
});
