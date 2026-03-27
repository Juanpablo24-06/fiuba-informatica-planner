import { describe, expect, it } from "vitest";
import { buildProgressSnapshot } from "@/lib/progress";
import type { Subject } from "@/lib/types";

const subject = (overrides: Partial<Subject>): Subject => ({
  id: overrides.id ?? "subject",
  code: overrides.code ?? null,
  name: overrides.name ?? "Materia",
  credits: overrides.credits ?? 6,
  weekly_hours: overrides.weekly_hours ?? 6,
  total_hours: overrides.total_hours ?? 96,
  term_suggested: overrides.term_suggested ?? 1,
  cycle: overrides.cycle ?? null,
  type: overrides.type ?? "obligatoria",
  requirements: overrides.requirements ?? null,
  template: overrides.template ?? null
});

describe("buildProgressSnapshot", () => {
  it("reuses the existing domain rules for CBC, electives and TIF", () => {
    const subjects: Subject[] = [
      subject({
        id: "cbc-1",
        name: "Analisis Matematico A",
        type: "cbc",
        cycle: "cbc",
        credits: 6
      }),
      subject({
        id: "ob-1",
        name: "Algoritmos y Programacion I",
        type: "obligatoria",
        credits: 8
      }),
      subject({
        id: "elective-generic",
        name: "Electivas/Optativas I",
        type: "electiva",
        credits: 4
      }),
      subject({
        id: "elective-real",
        name: "Inteligencia Artificial",
        type: "electiva",
        credits: 4
      }),
      subject({
        id: "tif-1",
        name: "Tesis/Trabajo Profesional",
        type: "obligatoria",
        credits: 12
      })
    ];

    const latestStatusMap = new Map([
      ["cbc-1", { status: "aprobado", color: null }],
      ["ob-1", { status: "aprobado", color: null }],
      ["elective-generic", { status: "aprobado", color: null }],
      ["elective-real", { status: "aprobado", color: null }],
      ["tif-1", { status: "aprobado", color: null }]
    ]);

    const snapshot = buildProgressSnapshot(subjects, latestStatusMap);

    expect(snapshot.approvedCbcCredits).toBe(6);
    expect(snapshot.approvedCbcCourses).toBe(1);
    expect(snapshot.approvedObligatoryCredits).toBe(8);
    expect(snapshot.approvedElectiveCredits).toBe(4);
    expect(snapshot.approvedTifCredits).toBe(12);
    expect(snapshot.approvedTotalCredits).toBe(30);
    expect(snapshot.progressPct).toBe(13);
  });
});
