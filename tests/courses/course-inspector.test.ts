import { describe, expect, it } from "vitest";
import { formatLegacyEvaluationTemplate } from "@/components/courses/course-inspector";

describe("course inspector legacy evaluation display", () => {
  it("keeps legacy template data visible as general academic information", () => {
    expect(
      formatLegacyEvaluationTemplate({
        parciales: 2,
        recuperatorios: 1,
        tps: 4,
        defensas: 1,
        finales: 1,
        promocion: true,
        notas: "Régimen anual."
      })
    ).toEqual([
      "Parciales: 2",
      "Recuperatorios: 1",
      "Trabajos prácticos: 4",
      "Defensas: 1",
      "Finales: 1",
      "Promoción: Sí",
      "Notas: Régimen anual."
    ]);
  });

  it("returns no rows for an absent template", () => {
    expect(formatLegacyEvaluationTemplate(null)).toEqual([]);
  });
});
