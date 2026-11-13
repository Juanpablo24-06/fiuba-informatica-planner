import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./fixtures";

test("summary surface loads after demo auth", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|didn't match/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  await loginAsDemo(page, "/");
  await expect(page.getByText("Cursada actual")).toBeVisible();
  const courseCard = page.locator("main button").filter({ has: page.getByText("Próximo", { exact: true }) }).first();
  if (await courseCard.count()) {
    await expect(courseCard).toBeEnabled({ timeout: 30_000 });
    await courseCard.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  expect(await page.locator("[data-motion-item], [data-motion-stagger]").evaluateAll((elements) =>
    elements.every((element) => !(element as HTMLElement).style.opacity && !(element as HTMLElement).style.transform)
  )).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("summary-hydration.png"), fullPage: true });
});

test("summary entrance respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loginAsDemo(page, "/");
  await expect(page.getByText("Cursada actual")).toBeVisible();
  expect(await page.locator("main").evaluate((root) =>
    root.getAnimations({ subtree: true }).filter((animation) => {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      return target instanceof Element && target.matches("[data-route-motion-root], [data-motion-item], [data-motion-stagger]");
    }).length
  )).toBe(0);
});

test("map surface loads after demo auth", async ({ page }) => {
  await loginAsDemo(page, "/mapa");
  await expect(page.locator("[data-map-root='true']")).toBeVisible();
});

test("courses surface loads after demo auth", async ({ page }) => {
  await loginAsDemo(page, "/cursos");
  await expect(page.locator("[data-ai-resource='course-inspector']")).toBeVisible();
  await expect(page.getByText("Requisitos", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ordenar cursos" }).click();
  await expect(page.getByRole("option", { name: "Nombre (A–Z)" })).toBeVisible();
  await page.getByRole("option", { name: "Nombre (A–Z)" }).click();
});

test("planner and calendar are separate workspaces", async ({ page }) => {
  // The planner GET can initialize a persisted scenario. Keep this UI check isolated.
  await page.route("**/api/planner**", async (route) => route.fulfill({ json: { scenarios: [], entries: [], offers: [] } }));
  await loginAsDemo(page, "/planificar");
  await expect(page.locator('[data-workspace-ready="true"]')).toBeVisible();
  const termPrompt = page.getByRole("heading", { name: "Elegí dónde vas a trabajar" });
  await expect(termPrompt).toBeVisible();
  await termPrompt.locator("..").getByRole("button").first().click();
  await expect(page.getByLabel("Cuatrimestre")).toBeVisible();
  await expect(page.getByRole("button", { name: "Semana" })).not.toBeVisible();

  await page.goto("/calendario", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-workspace-ready="true"]')).toBeVisible();
  await expect(page.getByLabel("Cuatrimestre")).toBeVisible();
  await expect(page.getByRole("button", { name: "Semana" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mes", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mes", exact: true }).click();
  await expect(page.locator('[data-calendar-month="true"]')).toBeVisible();
  await page.getByRole("button", { name: /^Ver / }).nth(15).click();
  await expect(page.getByText("GMT-3", { exact: true })).toBeVisible();
});

test("calendar loads planner data once without requesting offers", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  let plannerRequests = 0;
  let offerRequests = 0;

  await page.route("**/api/planner/offers?**", async (route) => {
    offerRequests += 1;
    await route.fulfill({ json: { offers: [] } });
  });
  await page.route("**/api/planner?**", async (route) => {
    plannerRequests += 1;
    await route.fulfill({ json: { entries: [], scenarios: [] } });
  });

  await loginAsDemo(page, "/calendario");
  const termPrompt = page.getByRole("heading", { name: "Elegí dónde vas a trabajar" });
  await expect(termPrompt).toBeVisible();
  await termPrompt.locator("..").getByRole("button").first().click();
  await expect(page).toHaveURL(/\/calendario\?term=/);

  plannerRequests = 0;
  offerRequests = 0;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-calendar-month="true"]')).toBeVisible();
  await expect.poll(() => plannerRequests).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(plannerRequests).toBeLessThanOrEqual(2);
  expect(offerRequests).toBe(0);
});

test("agenda weekly and evaluations surfaces load after demo auth", async ({ page }) => {
  await loginAsDemo(page, "/agenda/semana");
  await expect(page.getByText("Semana actual")).toBeVisible();

  await page.goto("/agenda/evaluaciones", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Mes actual")).toBeVisible();
  await expect(page.getByText("A futuro")).toBeVisible();
});
