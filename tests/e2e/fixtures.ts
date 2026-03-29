import { expect, type Page } from "@playwright/test";

export async function loginAsDemo(page: Page, targetPath = "/") {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Plan Ing Informática" })
  ).toBeVisible();
  const demoResponse = await page.request.post("/api/auth/demo");
  expect(demoResponse.ok()).toBe(true);
  await page.goto(targetPath, { waitUntil: "domcontentloaded" });
}

export async function openChatPanel(page: Page) {
  await page.getByRole("button", { name: "Consultá a Synapse" }).click();
  await expect(page.getByText("Synapse IA")).toBeVisible();
}

export async function expectNoPageErrors(page: Page) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.waitForTimeout(200);
  expect(pageErrors).toEqual([]);
}
