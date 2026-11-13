import { describe, expect, it } from "vitest";
import type { CourseCatalogItem } from "@/lib/courses/catalog";
import {
  editorValuesFor,
  emptyCourseForm,
  relationCandidates,
  SUBJECT_TYPES,
  subjectPayloadFor,
  validateCourseForm
} from "@/components/courses/course-form";

const course = (overrides: Partial<CourseCatalogItem> = {}): CourseCatalogItem => ({
  subject: {
    id: "subject-1",
    code: "75.01",
    name: "Algoritmos",
    credits: 8,
    weekly_hours: 6,
    total_hours: 96,
    term_suggested: 3,
    cycle: "segundo",
    type: "obligatoria",
    requirements: ["CBC aprobado"],
    template: null,
    description: "Una descripción.",
    term_order: 2,
    evaluation_info: "Promoción opcional.",
    notes: "Se dicta ambos cuatrimestres.",
    useful_links: [{ label: "Oficial", url: "https://fi.uba.ar" }],
    custom_fields: [{ label: "Departamento", value: "Computación" }],
    deleted_at: null
  },
  status: null,
  prerequisites: [{ id: "subject-0", code: "75.00", name: "Álgebra", term_suggested: 1 }],
  unlocks: [{ id: "subject-2", code: "75.02", name: "Sistemas", term_suggested: 4 }],
  currentEnrollment: null,
  events: [],
  ...overrides
});

describe("course form helpers", () => {
  it("starts new subjects without forcing a classification", () => {
    expect(emptyCourseForm().type).toBe("");
    expect(SUBJECT_TYPES[0]).toEqual({ value: "", label: "Sin tipo" });
  });

  it("hydrates all structural fields and both relation directions", () => {
    expect(editorValuesFor(course())).toMatchObject({
      name: "Algoritmos",
      description: "Una descripción.",
      term_suggested: "3",
      term_order: "2",
      prerequisiteIds: ["subject-0"],
      unlockIds: ["subject-2"],
      useful_links: [{ label: "Oficial", url: "https://fi.uba.ar" }],
      custom_fields: [{ label: "Departamento", value: "Computación" }]
    });
  });

  it("builds API payloads from complete custom rows", () => {
    const values = {
      ...emptyCourseForm(),
      name: "  Nueva materia ",
      credits: "6",
      term_suggested: "2",
      useful_links: [{ label: "Campus", url: "https://campus.example" }],
      custom_fields: [{ label: "Departamento", value: "Matemática" }]
    };

    expect(subjectPayloadFor(values)).toMatchObject({
      name: "Nueva materia",
      credits: 6,
      term_suggested: 2,
      useful_links: [{ label: "Campus", url: "https://campus.example" }],
      custom_fields: [{ label: "Departamento", value: "Matemática" }]
    });
  });

  it("requires a name and rejects fractional structural numbers", () => {
    expect(validateCourseForm(emptyCourseForm()).name).toBe("El nombre es obligatorio.");
    expect(validateCourseForm({ ...emptyCourseForm(), name: "Materia", term_order: "1.5" }).term_order).toContain("entero");
    expect(validateCourseForm({ ...emptyCourseForm(), name: "Materia", credits: "-1" }).credits).toContain("entero");
    expect(validateCourseForm({ ...emptyCourseForm(), name: "Materia", term_suggested: "2" })).toEqual({});
  });

  it("blocks incomplete links and custom fields instead of dropping them", () => {
    const values = {
      ...emptyCourseForm(),
      name: "Materia",
      useful_links: [{ label: "Campus", url: "no-es-url" }],
      custom_fields: [{ label: "Departamento", value: "" }]
    };
    expect(validateCourseForm(values).useful_links?.[0]).toContain("URL");
    expect(validateCourseForm(values).custom_fields?.[0]).toContain("valor");
  });

  it("filters relation candidates by direction and excludes the edited subject", () => {
    const candidates = [
      course({ subject: { ...course().subject, id: "current", name: "Actual", term_suggested: 3 } }),
      course({ subject: { ...course().subject, id: "previous", name: "Anterior", term_suggested: 2 } }),
      course({ subject: { ...course().subject, id: "same", name: "Mismo período", term_suggested: 3 } }),
      course({ subject: { ...course().subject, id: "next", name: "Posterior", term_suggested: 4 } }),
      course({ subject: { ...course().subject, id: "unknown", name: "Sin período", term_suggested: null } })
    ];

    expect(relationCandidates(candidates, {
      editingSubjectId: "current",
      subjectTerm: 3,
      direction: "prerequisite"
    }).map(({ course: item }) => item.subject.id)).toEqual(["previous"]);
    expect(relationCandidates(candidates, {
      editingSubjectId: "current",
      subjectTerm: 3,
      direction: "unlock"
    }).map(({ course: item }) => item.subject.id)).toEqual(["next"]);
  });

  it("keeps selected out-of-order relations visible and marks them", () => {
    const candidates = [
      course({ subject: { ...course().subject, id: "current", name: "Actual", term_suggested: 3 } }),
      course({ subject: { ...course().subject, id: "same", name: "Mismo período", term_suggested: 3 } }),
      course({ subject: { ...course().subject, id: "unknown", name: "Sin período", term_suggested: null } }),
      course({ subject: { ...course().subject, id: "previous", name: "Anterior", term_suggested: 2 } })
    ];

    expect(relationCandidates(candidates, {
      editingSubjectId: "current",
      subjectTerm: 3,
      direction: "prerequisite",
      selectedIds: ["same", "unknown"]
    }).map(({ course: item, outOfOrder }) => [item.subject.id, outOfOrder])).toEqual([
      ["previous", false],
      ["same", true],
      ["unknown", true]
    ]);
  });

  it("does not apply period ordering when the edited subject has no period", () => {
    const candidates = [
      course({ subject: { ...course().subject, id: "current", term_suggested: null } }),
      course({ subject: { ...course().subject, id: "any-period", term_suggested: 8 } }),
      course({ subject: { ...course().subject, id: "unknown", term_suggested: null } })
    ];

    expect(relationCandidates(candidates, {
      editingSubjectId: "current",
      subjectTerm: null,
      direction: "prerequisite"
    }).map(({ course: item }) => item.subject.id)).toEqual(["any-period", "unknown"]);
  });
});
