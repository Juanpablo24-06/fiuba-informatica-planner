import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./fixtures";

test("demo login enters the app", async ({ page }) => {
  await loginAsDemo(page, "/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Cursada actual")).toBeVisible();
});
