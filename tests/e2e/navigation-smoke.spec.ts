import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./fixtures";

test("summary surface loads after demo auth", async ({ page }) => {
  await loginAsDemo(page, "/");
  await expect(page.getByText("Cursada actual")).toBeVisible();
});

test("map surface loads after demo auth", async ({ page }) => {
  await loginAsDemo(page, "/mapa");
  await expect(page.locator("[data-map-root='true']")).toBeVisible();
});

test("agenda weekly and evaluations surfaces load after demo auth", async ({ page }) => {
  await loginAsDemo(page, "/agenda/semana");
  await expect(page.getByText("Semana actual")).toBeVisible();

  await page.goto("/agenda/evaluaciones", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Mes actual")).toBeVisible();
  await expect(page.getByText("A futuro")).toBeVisible();
});
