import { describe, expect, it } from "vitest";
import { subjectCreateSchema, subjectUpdateSchema } from "@/lib/admin/subjects";

describe("admin subjects service contract", () => {
  it("accepts full subject creation payloads", () => {
    expect(
      subjectCreateSchema.parse({
        code: "75.01",
        name: "Algoritmos y Programación I",
        credits: 8,
        weekly_hours: 6,
        total_hours: 96,
        term_suggested: 1,
        cycle: "grado",
        type: "obligatoria",
        requirements: ["cbc"],
        template: { parciales: 2 }
      })
    ).toMatchObject({
      code: "75.01",
      name: "Algoritmos y Programación I"
    });
  });

  it("accepts partial subject updates", () => {
    expect(
      subjectUpdateSchema.parse({
        name: "Algo I",
        weekly_hours: 8
      })
    ).toMatchObject({
      name: "Algo I",
      weekly_hours: 8
    });
  });

  it("accepts the editable curriculum fields without a FIUBA-specific term cap", () => {
    expect(
      subjectCreateSchema.parse({
        name: "Seminario avanzado",
        term_suggested: 12,
        term_order: 2,
        description: "Descripción",
        evaluation_info: "Régimen promocional",
        notes: "Se dicta anualmente",
        useful_links: [{ label: "Página oficial", url: "https://example.com/course" }],
        custom_fields: [{ label: "Departamento", value: "Matemática" }]
      })
    ).toMatchObject({
      term_suggested: 12,
      term_order: 2,
      custom_fields: [{ label: "Departamento", value: "Matemática" }]
    });
  });

  it("rejects invalid custom links and negative plan order", () => {
    expect(() =>
      subjectCreateSchema.parse({
        name: "Materia",
        term_order: -1
      })
    ).toThrow();
    expect(() =>
      subjectCreateSchema.parse({
        name: "Materia",
        useful_links: [{ label: "Página", url: "no-es-url" }]
      })
    ).toThrow();
  });
});
