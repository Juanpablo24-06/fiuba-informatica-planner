import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard page source", () => {
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), "app/(app)/page.tsx"),
    "utf8"
  );

  it("opens the current calendar from the course schedule CTA", () => {
    expect(pageSource).toContain("Cursada actual");
    expect(pageSource).toContain("Ver horario");
    expect(pageSource).toContain('href="/calendario"');
    expect(pageSource).not.toContain("/agenda/semana");
  });

  it("renames the upcoming dates CTA to describe the calendar content more clearly", () => {
    expect(pageSource).toContain("Ver calendario y próximas fechas");
    expect(pageSource).toContain("/agenda/evaluaciones");
    expect(pageSource).not.toContain("Abrir agenda");
  });
});
