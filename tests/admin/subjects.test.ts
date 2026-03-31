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
});
