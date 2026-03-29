import { expect, test } from "@playwright/test";
import { loginAsDemo, openChatPanel } from "./fixtures";

test("admin and chat surfaces are reachable after demo login", async ({ page }) => {
  await loginAsDemo(page, "/admin");
  await expect(page.getByText("Centro de control académico")).toBeVisible();

  await openChatPanel(page);
  await expect(
    page.getByText("Preguntá por tu semana, parciales o prioridades.")
  ).toBeVisible();
});
