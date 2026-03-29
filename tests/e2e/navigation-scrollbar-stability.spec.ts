import { expect, test, type Page } from "@playwright/test";
import { loginAsDemo } from "./fixtures";

const readShellMetrics = (page: Page) =>
  page.evaluate(() => {
    const headerSurface = document.querySelector("header > div");
    const main = document.querySelector("main");

    return {
      headerWidth: headerSurface?.getBoundingClientRect().width ?? 0,
      mainWidth: main?.getBoundingClientRect().width ?? 0,
      compensation: getComputedStyle(document.documentElement)
        .getPropertyValue("--layout-scrollbar-compensation")
        .trim()
    };
  });

test("summary to map keeps the top navigation width stable", async ({ page }) => {
  await loginAsDemo(page, "/");
  await expect(page.getByText("Cursada actual")).toBeVisible();

  const before = await readShellMetrics(page);

  await page.locator("a[data-map-transition-source='top-nav-map']").first().click();
  await page.waitForURL("**/mapa");
  await expect(page.locator("[data-map-root='true']")).toBeVisible();

  const after = await readShellMetrics(page);

  expect(Math.abs(after.headerWidth - before.headerWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.mainWidth - before.mainWidth)).toBeLessThanOrEqual(1);
});

test("opening the chat dialog keeps the fixed chrome width stable", async ({ page }) => {
  await loginAsDemo(page, "/");
  await expect(page.getByText("Cursada actual")).toBeVisible();

  const before = await readShellMetrics(page);

  await page.getByRole("button", { name: "Consultá a Synapse" }).click();
  await expect(page.getByText("Synapse IA")).toBeVisible();

  const after = await readShellMetrics(page);

  expect(Math.abs(after.headerWidth - before.headerWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.mainWidth - before.mainWidth)).toBeLessThanOrEqual(1);
});

test("map view still covers the right viewport edge without leaving a cut strip", async ({ page }) => {
  await loginAsDemo(page, "/mapa");
  await expect(page.locator("[data-map-root='true']")).toBeVisible();

  const mapGeometry = await page.evaluate(() => {
    const getRight = (selector: string) =>
      document.querySelector(selector)?.getBoundingClientRect().right ?? 0;

    return {
      viewportWidth: window.innerWidth,
      mapRootRight: getRight("[data-map-root='true']"),
      mapShellRight: getRight("[data-map-view-shell='true']"),
      mapSceneRight: getRight("[data-map-scene-background='true']")
    };
  });

  expect(Math.abs(mapGeometry.mapRootRight - mapGeometry.viewportWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(mapGeometry.mapShellRight - mapGeometry.viewportWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(mapGeometry.mapSceneRight - mapGeometry.viewportWidth)).toBeLessThanOrEqual(1);
});
