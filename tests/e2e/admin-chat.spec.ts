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
    const response = {
      type: "done",
      response: {
        answer: `Respuesta ${requestCount}`,
        reasoning: "Se comprobó el contexto de prueba.",
        warnings: [],
        provider: "openrouter",
        model: "openai/gpt-oss-120b:free",
        reasoningMode: "effort"
      },
      actionResults: [],
      memoriesStored: 0,
      memoryProvider: "supabase",
      threadId: null,
      stored: false
    };
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: `${JSON.stringify({ type: "status", status: "respondiendo" })}\n${JSON.stringify(response)}\n`
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
