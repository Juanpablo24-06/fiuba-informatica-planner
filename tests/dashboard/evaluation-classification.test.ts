import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@/lib/types";
import {
  buildEvaluationSections,
  classifyEvaluationEvent
} from "@/lib/dashboard/evaluation-classification";

const buildEvent = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id: overrides.id ?? "event",
  title: overrides.title ?? "Parcial 1",
  startsAt: overrides.startsAt ?? "2026-03-23T11:00:00.000Z",
  endsAt: overrides.endsAt ?? "2026-03-23T13:00:00.000Z",
  source: overrides.source ?? "internal",
  subject: overrides.subject ?? "Análisis Matemático II",
  type: overrides.type ?? undefined,
  color: overrides.color ?? undefined,
  tags: overrides.tags ?? undefined
});

describe("classifyEvaluationEvent", () => {
  it("prefers type over title when deciding the evaluation bucket", () => {
    expect(
      classifyEvaluationEvent(buildEvent({ id: "tp-title-parcial", type: "tp", title: "Parcial 1" }))
    ).toBe("entregas");
    expect(
      classifyEvaluationEvent(buildEvent({ id: "final-title-defensa", type: "final", title: "Defensa de laboratorio" }))
    ).toBe("finales");
    expect(
      classifyEvaluationEvent(buildEvent({ id: "recup-title-final", type: "recuperatorio", title: "Final integrador" }))
    ).toBe("parciales");
  });

  it("keeps generic exam events in the right bucket based on the available title clues", () => {
    expect(
      classifyEvaluationEvent(buildEvent({ id: "exam-final", type: "exam", title: "Final integrador" }))
    ).toBe("finales");
    expect(
      classifyEvaluationEvent(buildEvent({ id: "exam-tp", type: "exam", title: "TP evaluable" }))
    ).toBe("entregas");
    expect(classifyEvaluationEvent(buildEvent({ id: "exam-generic", type: "exam", title: "Examen 2" }))).toBe(
      "parciales"
    );
  });

  it("falls back to the title when the type does not identify an evaluation", () => {
    expect(classifyEvaluationEvent(buildEvent({ id: "title-tp", title: "TP 2" }))).toBe("entregas");
    expect(classifyEvaluationEvent(buildEvent({ id: "title-recup", title: "Recuperatorio 1" }))).toBe("parciales");
    expect(classifyEvaluationEvent(buildEvent({ id: "title-defense", title: "Defensa final" }))).toBe("finales");
  });
});

describe("buildEvaluationSections", () => {
  it("drops regular classes from the evaluation timeline", () => {
    const sections = buildEvaluationSections([
      buildEvent({ id: "class-1", type: "clase", title: "Clase práctica" }),
      buildEvent({ id: "tp-1", type: "tp", title: "TP 2" })
    ]);

    expect(sections.flatMap((section) => section.events.map((event) => event.id))).toEqual([
      "tp-1"
    ]);
  });
});
