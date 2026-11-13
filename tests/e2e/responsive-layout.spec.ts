import { expect, test, type Page } from "@playwright/test";
import { loginAsDemo } from "./fixtures";

const expectNoDocumentOverflow = async (page: Page) => {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      )
    )
    .toBe(true);
};

test("navigation stays reachable through the tablet breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await loginAsDemo(page, "/");

  for (const label of ["Resumen", "Mapa", "Cursos", "Planificar", "Calendario", "Admin"]) {
    await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /Perfil/ })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("planner changes from one to three to six visible days", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsDemo(page, "/planificar");
  const termPrompt = page.getByRole("heading", { name: "Elegí dónde vas a trabajar" });
  await expect(termPrompt).toBeVisible();
  await termPrompt.locator("..").getByRole("button").first().click();

  const grid = page.locator('[data-temporal-grid="planning"]');
  await expect.poll(() => grid.getAttribute("data-visible-days")).toBe("1");
  await expectNoDocumentOverflow(page);

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect.poll(() => grid.getAttribute("data-visible-days")).toBe("3");
  await expectNoDocumentOverflow(page);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect.poll(() => grid.getAttribute("data-visible-days")).toBe("6");
  await expectNoDocumentOverflow(page);
});

test("course detail opens as an immediate tablet dialog", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await loginAsDemo(page, "/cursos");
  await expect(page.locator('[data-courses-ready="true"]')).toBeVisible();
  await page.locator('[data-ai-resource="course"]').first().click();

  const dialog = page.getByRole("dialog", { name: /Detalle de/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cerrar detalle" })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("calendar opens as the monthly workspace with filters and sidebar context", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsDemo(page, "/calendario");

  const termPrompt = page.getByRole("heading", { name: "Elegí dónde vas a trabajar" });
  if (await termPrompt.isVisible({ timeout: 10000 }).catch(() => false)) {
    await termPrompt.locator("..").getByRole("button").first().click();
  }

  await expect(page.locator('[data-calendar-month="true"]')).toBeVisible();
  await expect(page.getByText("Próximos", { exact: true })).toBeVisible();
  await expect(page.getByText("carga mensual", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exámenes", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Exámenes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Exámenes", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expectNoDocumentOverflow(page);
});
