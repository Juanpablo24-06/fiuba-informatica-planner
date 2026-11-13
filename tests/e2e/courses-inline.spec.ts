import { expect, test, type Page } from "@playwright/test";
import { loginAsDemo } from "./fixtures";

const expectNoDocumentOverflow = async (page: Page) => {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
    .toBe(true);
};

test("course create and edit stay in the inspector instead of opening a modal", async ({ page }) => {
  await loginAsDemo(page, "/cursos");
  await expect(page.locator('[data-ai-resource="courses"]')).toBeVisible();

  await page.getByRole("button", { name: "Nueva materia" }).click();
  const createEditor = page.locator('[data-course-form-mode="create"]');
  await expect(createEditor).toBeVisible();
  await expect(createEditor.getByRole("heading", { name: "Sumá una materia al plan" })).toBeVisible();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expectNoDocumentOverflow(page);
  await createEditor.getByRole("button", { name: "Cancelar" }).click();

  await page.locator('[data-ai-resource="course"]').first().click();
  await page.getByRole("button", { name: "Editar" }).click();
  const editEditor = page.locator('[data-course-form-mode="edit"]');
  await expect(editEditor).toBeVisible();
  await expect(editEditor.getByLabel("Nombre")).toBeVisible();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expectNoDocumentOverflow(page);
  await editEditor.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("button", { name: "Editar" })).toBeVisible();
});
