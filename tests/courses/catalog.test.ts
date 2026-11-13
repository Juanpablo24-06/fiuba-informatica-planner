import { describe, expect, it } from "vitest";
import { buildCourseCatalog, courseMatchesFilter } from "@/lib/courses/catalog";
import type { Subject } from "@/lib/types";

const subject = (id: string, name: string, extra: Partial<Subject> & { term_order?: number | null } = {}): Subject => ({
  id,
  code: id.toUpperCase(),
  name,
  credits: 6,
  weekly_hours: 6,
  total_hours: 96,
  term_suggested: 3,
  cycle: "segundo",
  type: "obligatoria",
  requirements: null,
  template: null,
  ...extra
} as Subject);

describe("course catalog builder", () => {
  it("uses prerequisite completion when filtering available courses", () => {
    const subjects = [subject("a", "Primera"), subject("b", "Segunda")];
    const prerequisites = [{ subject_id: "b", prerequisite_id: "a" }];
    const blocked = buildCourseCatalog({ subjects, prerequisites, statusMap: new Map() });
    expect(courseMatchesFilter(blocked.find((course) => course.subject.id === "b")!, "disponibles")).toBe(false);
    const unlocked = buildCourseCatalog({ subjects, prerequisites, statusMap: new Map([["a", { status: "aprobado", color: null }]]) });
    expect(courseMatchesFilter(unlocked.find((course) => course.subject.id === "b")!, "disponibles")).toBe(true);
  });
  it("builds prerequisite and unlock relationships from the normalized edge table", () => {
    const subjects = [subject("a", "Análisis"), subject("b", "Bases")];
    const courses = buildCourseCatalog({
      subjects,
      prerequisites: [{ subject_id: "b", prerequisite_id: "a" }],
      statusMap: new Map([["a", { status: "aprobado", color: null }]])
    });

    expect(courses.find((course) => course.subject.id === "b")?.prerequisites.map((item) => item.id)).toEqual(["a"]);
    expect(courses.find((course) => course.subject.id === "a")?.unlocks.map((item) => item.id)).toEqual(["b"]);
    expect(courses.find((course) => course.subject.id === "a")?.status?.status).toBe("aprobado");
  });

  it("keeps untracked subjects available and recognizes CBC/elective filters", () => {
    const subjects = [
      subject("cbc", "CBC", { cycle: "cbc", type: "obligatoria", credits: null }),
      subject("opt", "Optativa", { type: "electiva" }),
      subject("regular", "Regular")
    ];
    const courses = buildCourseCatalog({ subjects, prerequisites: [], statusMap: new Map() });

    expect(courses.filter((course) => courseMatchesFilter(course, "disponibles"))).toHaveLength(3);
    expect(courses.filter((course) => courseMatchesFilter(course, "cbc"))).toHaveLength(1);
    expect(courses.filter((course) => courseMatchesFilter(course, "electivas"))).toHaveLength(1);
  });

  it("deduplicates invalid relation rows and orders subjects within a period", () => {
    const subjects = [
      subject("second", "Segunda", { term_order: 2 }),
      subject("first", "Primera", { term_order: 1 }),
      subject("other", "Otro", { term_suggested: 4, term_order: 1 })
    ];
    const courses = buildCourseCatalog({
      subjects,
      prerequisites: [
        { subject_id: "second", prerequisite_id: "first" },
        { subject_id: "second", prerequisite_id: "first" },
        { subject_id: "first", prerequisite_id: "first" }
      ],
      statusMap: new Map()
    });

    expect(courses.map((course) => course.subject.id)).toEqual(["first", "second", "other"]);
    expect(courses.find((course) => course.subject.id === "second")?.prerequisites.map((item) => item.id)).toEqual(["first"]);
    expect(courses.find((course) => course.subject.id === "first")?.unlocks.map((item) => item.id)).toEqual(["second"]);
  });
});
