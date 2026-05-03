import { expect, test } from "@playwright/test";
import { loginAsDemo, openChatPanel } from "./fixtures";

test("admin surface is reachable after demo login", async ({ page }) => {
  await loginAsDemo(page, "/admin");
  await expect(page.getByText("Centro de control académico")).toBeVisible();
});

test("chat can send a second message after the first response", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/api/chat", async (route) => {
    requestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        response: {
          answer: `Respuesta ${requestCount}`,
          reasoning: null,
          follow_up_questions: [],
          warnings: [],
          actions: [],
          confidence: 0.9,
          model: "openai/gpt-oss-120b:free",
          provider: "openrouter"
        },
        actionResults: [],
        usedFallback: false,
        capabilities: {
          role: "admin",
          allowActions: false,
          reasoningLevel: "medio",
          rulesVersion: "test"
        },
        threadId: null,
        stored: false
      })
    });
  });

  await loginAsDemo(page, "/admin");
  await openChatPanel(page);

  const input = page.getByPlaceholder("Preguntá sobre parciales, horarios, correlativas...");
  await input.fill("primer mensaje");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByText("Respuesta 1")).toBeVisible();

  await input.fill("segundo mensaje");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByText("Respuesta 2")).toBeVisible();
  expect(requestCount).toBe(2);
});
