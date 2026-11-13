import { expect, test } from "@playwright/test";
import { loginAsDemo, isolatePlannerMutations } from "./fixtures";

const makeScenario = (id: string, name: string, position: number) => ({
  id,
  termId: "term-2026",
  profileKey: "default",
  name,
  position,
  lifecycle: "draft",
  confirmedAt: null,
  selections: []
});

test("renders the migrated Plan A scenario payload with legacy selections", async ({ page }) => {
  await isolatePlannerMutations(page);
  await page.addInitScript(() => window.localStorage.clear());
  const scenario = {
    ...makeScenario("planner-legacy-term-2026", "Plan A", 0),
    selections: [1, 2, 3, 4].map((index) => ({
      id: `legacy-selection-${index}`,
      scenarioId: "planner-legacy-term-2026",
      kind: "course",
      subjectId: null,
      enrollmentId: null,
      title: `Materia migrada ${index}`,
      code: `CB00${index}`,
      statusSnapshot: "planned",
      alignment: "unresolved",
      color: "#6586d8",
      notes: null,
      slots: [{ day: "lun", start_time: "09:00", end_time: "10:00", location: null, class_type: "theory" }],
      source: "legacy",
      confirmedEnrollmentId: null,
      offerIds: []
    }))
  };
  await page.route("**/api/planner**", async (route) => {
    if (route.request().url().includes("/offers")) return route.fulfill({ json: { offers: [] } });
    return route.fulfill({ json: { scenarios: [scenario], activeScenarioId: scenario.id, entries: [] } });
  });

  await loginAsDemo(page, "/planificar");
  const prompt = page.getByRole("heading", { name: "Elegí dónde vas a trabajar" });
  if (await prompt.isVisible({ timeout: 10000 }).catch(() => false)) await prompt.locator("..").getByRole("button").first().click();
  await expect(page.getByRole("tab", { name: "Plan A" })).toBeVisible();
  await expect(page.getByLabel("Selecciones del escenario").getByText("Materia migrada 1", { exact: true })).toBeVisible();
});

test("planner keeps scenarios isolated and creates a personal activity from an empty slot", async ({ page }) => {
  await isolatePlannerMutations(page);
  await page.addInitScript(() => window.localStorage.clear());
  const planA = makeScenario("scenario-a", "Plan A", 0);
  const planB = makeScenario("scenario-b", "Plan B", 1);
  await page.route("**/api/planner/scenarios", async (route) => route.fulfill({ json: { scenario: planB } }));
  await page.route("**/api/planner?termId=**", async (route) => route.fulfill({ json: { scenarios: [planA], activeScenarioId: planA.id } }));
  await page.route("**/api/planner/offers?**", async (route) => route.fulfill({ json: { offers: [] } }));
  await page.route("**/api/planner/scenarios/**", async (route) => {
    if (route.request().method() === "POST" && route.request().url().endsWith("/duplicate")) return route.fulfill({ json: { scenario: planB } });
    if (route.request().method() === "POST" && route.request().url().endsWith("/confirm")) return route.fulfill({ json: { ok: true } });
    return route.fulfill({ json: { scenario: planB } });
  });

  await loginAsDemo(page, "/planificar");
  const prompt = page.getByRole("heading", { name: "Elegí dónde vas a trabajar" });
  await expect(prompt).toBeVisible();
  await prompt.locator("..").getByRole("button").first().click();
  await expect(page.getByRole("tab", { name: "Plan A" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[data-temporal-grid="planning"]')).toHaveAttribute("data-visible-days", "6");

  await page.getByRole("button", { name: "Crear escenario" }).click();
  await expect(page.getByRole("tab", { name: "Plan B" })).toBeVisible();
  await page.getByRole("tab", { name: "Plan A" }).click();
  await page.locator('[data-grid-slot="mie-19"]').click();
  await expect(page.getByRole("dialog", { name: "Nueva actividad" })).toBeVisible();
  await page.getByRole("textbox", { name: "Título de actividad" }).fill("Grupo de estudio");
  await page.getByRole("button", { name: "Guardar actividad" }).click();
  await expect(page.getByText("Grupo de estudio", { exact: true })).toBeVisible();

  const rail = page.locator('[data-planner-rail="true"]');
  await rail.getByRole("button", { name: "Contraer plan actual" }).click();
  await expect(rail).toHaveAttribute("data-collapsed", "true");
  await rail.getByRole("button", { name: "Abrir plan actual" }).click();
  await expect(rail).toHaveAttribute("data-collapsed", "false");
});

test("planner confirms only selected subjects after manual loading", async ({ page }) => {
  await isolatePlannerMutations(page);
  await page.addInitScript(() => window.localStorage.clear());
  const scenario = makeScenario("scenario-confirm", "Plan A", 0);
  const persistedSelections: Record<string, unknown>[] = [];
  await page.route("**/api/planner?termId=**", async (route) => route.fulfill({ json: { scenarios: [{ ...scenario, selections: persistedSelections }], activeScenarioId: scenario.id } }));
  await page.route("**/api/planner/offers?**", async (route) => route.fulfill({ json: { offers: [] } }));
  let confirmAttempts = 0;
  let selectionPayload: Record<string, unknown> | null = null;
  await page.route("**/api/planner/scenarios/**", async (route) => {
    const request = route.request();
    const url = request.url();
    if (request.method() === "POST" && url.endsWith("/selections")) {
      selectionPayload = request.postDataJSON() as Record<string, unknown>;
      const selection = { id: "selection-server", scenarioId: scenario.id, ...selectionPayload, confirmedEnrollmentId: null, offerIds: [] };
      persistedSelections.push(selection);
      return route.fulfill({ json: { selection } });
    }
    if (request.method() === "POST" && url.endsWith("/confirm")) {
      confirmAttempts += 1;
      if (confirmAttempts === 1) return route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ error: "Alineación inválida" }) });
      return route.fulfill({ json: { ok: true, scenario } });
    }
    return route.fulfill({ json: { ok: true, scenario } });
  });

  await loginAsDemo(page, "/planificar");
  const prompt = page.getByRole("heading", { name: "Elegí dónde vas a trabajar" });
  await prompt.locator("..").getByRole("button").first().click();
  await page.getByRole("button", { name: "Añadir materia" }).click();
  await page.getByRole("textbox", { name: "Buscar materia" }).fill("Materia externa de prueba");
  await page.getByRole("button", { name: "Cargar materia manual" }).click();
  await page.getByRole("textbox", { name: "Nombre de materia manual" }).fill("Materia externa de prueba");
  await page.getByRole("button", { name: "Añadir al escenario" }).click();
  const rail = page.getByLabel("Selecciones del escenario");
  await expect(rail.getByText("Materia externa de prueba", { exact: true })).toBeVisible();
  await expect.poll(() => selectionPayload).not.toBeNull();
  expect(selectionPayload).toEqual(expect.objectContaining({ subjectId: null, slots: [{ day: "lun", start_time: "18:00", end_time: "20:00", location: null, class_type: "other" }] }));
  await page.getByRole("button", { name: "Confirmar plan" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Alinear y confirmar plan" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Materia externa de prueba", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar plan" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Alineación inválida");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar plan" }).click();
  await expect(dialog).not.toBeVisible();
  expect(confirmAttempts).toBe(2);
});
