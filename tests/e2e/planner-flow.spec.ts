import { expect, test } from "@playwright/test";
import { loginAsDemo, isolatePlannerMutations } from "./fixtures";

const offer = {
  raw: "sample",
  name: "CURSO: 01A",
  schedule: "Lunes 09:00–11:00",
  activity: "ÁLGEBRA LINEAL",
  code: "CB002",
  commission: "CURSO: 01A",
  shift: "Mañana",
  capacity: "40 / 60",
  instance: "Promoción",
  location: "Sede Paseo Colón",
  teachers: ["DOCENTE DE PRUEBA"],
  slots: [
    { classType: "Teórica", day: "Lunes", startTime: "09:00", endTime: "11:00", room: "201-PC" },
    { classType: "Práctica", day: "Miércoles", startTime: "11:00", endTime: "13:00", room: "203-PC" }
  ]
};

test("adds a course first and chooses its commission from the plan", async ({ page }) => {
  await isolatePlannerMutations(page);
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.route("**/api/planner/offers?**", async (route) => route.fulfill({ json: { offers: [offer] } }));
  await page.route("**/api/planner?**", async (route) => route.fulfill({ json: { entries: [] } }));
  await page.route("**/api/planner", async (route) => route.fulfill({ json: { entries: [] } }));

  await loginAsDemo(page, "/planificar");
  const termPrompt = page.getByRole("heading", { name: "Elegí dónde vas a trabajar" });
  await expect(termPrompt).toBeVisible();
  await termPrompt.locator("..").getByRole("button").first().click();
  await expect(page).toHaveURL(/\/planificar\?term=/);

  await page.getByRole("button", { name: "Añadir materia" }).click();
  await page.getByRole("button", { name: /ÁLGEBRA LINEAL/ }).click();

  await expect(page.getByText("ÁLGEBRA LINEAL", { exact: true })).toBeVisible();
  const plan = page.getByRole("complementary", { name: "Selecciones del escenario" });
  const algebraRow = plan.getByText("ÁLGEBRA LINEAL", { exact: true }).locator("..");
  await algebraRow.locator("summary").click();
  await page.getByRole("button", { name: /CURSO: 01A/ }).click();
  await expect(plan.locator("summary").getByText("CURSO: 01A", { exact: true })).toBeVisible();
});
