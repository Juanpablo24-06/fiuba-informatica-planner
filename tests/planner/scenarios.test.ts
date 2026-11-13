import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildPlannerSubjectOptions } from "@/lib/planner/academic-status";
import {
  mapPlannerScenarioRow,
  mapPlannerSelectionRow,
  normalizeDuplicatedSelectionRow,
  plannerSelectionCreateSchema,
  plannerScenarioCreateSchema,
  selectionReferencesMatch
} from "@/lib/planner/scenarios";

const subject = (id: string, name: string, termSuggested: number | null = 1) => ({
  id,
  name,
  code: id.toUpperCase(),
  credits: null,
  weekly_hours: null,
  total_hours: null,
  term_suggested: termSuggested,
  term_order: null,
  cycle: null,
  type: null,
  requirements: null,
  template: null,
  deleted_at: null
});

describe("planner academic status", () => {
  it("derives blocked/available states and prioritizes available subjects", () => {
    const options = buildPlannerSubjectOptions({
      subjects: [subject("base", "Base"), subject("next", "Siguiente", 2), subject("done", "Aprobada")],
      prerequisites: [{ subject_id: "next", prerequisite_id: "base" }],
      latestStatuses: new Map([
        ["done", "aprobado"],
        ["base", null]
      ])
    });

    expect(options.map((option) => [option.name, option.status])).toEqual([
      ["Base", "available"],
      ["Siguiente", "blocked"],
      ["Aprobada", "aprobado"]
    ]);
    expect(options[1]?.blockedBy).toEqual(["Base"]);
  });

  it("does not let a malformed self-edge block a course", () => {
    const [option] = buildPlannerSubjectOptions({
      subjects: [subject("base", "Base")],
      prerequisites: [{ subject_id: "base", prerequisite_id: "base" }],
      latestStatuses: new Map()
    });
    expect(option?.status).toBe("available");
  });
});

describe("planner scenario contracts", () => {
  it("accepts one selection with several offers and slots", () => {
    const parsed = plannerSelectionCreateSchema.parse({
      kind: "course",
      title: "Programación II",
      source: "manual",
      offerIds: ["offer-a", "offer-b"],
      slots: [
        { day: "lun", start_time: "09:00", end_time: "11:00", location: "Aula 1" },
        { day: "mie", start_time: "13:00", end_time: "15:00", location: null }
      ]
    });
    expect(parsed.offerIds).toEqual(["offer-a", "offer-b"]);
    expect(parsed.slots).toHaveLength(2);
  });

  it("keeps personal activities outside academic alignment", () => {
    expect(() => plannerSelectionCreateSchema.parse({
      kind: "personal",
      title: "Grupo de estudio",
      subjectId: "11111111-1111-4111-8111-111111111111"
    })).toThrow();
    const activity = plannerSelectionCreateSchema.parse({ kind: "personal", title: "Gimnasio" });
    expect(activity.alignment).toBeUndefined();
  });

  it("maps persisted rows without losing the scenario/offer contract", () => {
    const selection = mapPlannerSelectionRow({
      id: "selection-1",
      scenario_id: "scenario-1",
      kind: "course",
      title: "Álgebra Lineal",
      alignment: "unresolved",
      source: "legacy",
      slots: [{ day: "lun", start_time: "09:00", end_time: "11:00", location: null }]
    }, ["offer-1", "offer-2"]);
    const scenario = mapPlannerScenarioRow({ id: "scenario-1", term_id: "term-1", name: "Plan A", position: 0 }, [selection]);
    expect(scenario.selections[0]?.offerIds).toEqual(["offer-1", "offer-2"]);
    expect(scenario.lifecycle).toBe("draft");
  });

  it("requires a term and normalized name when creating a scenario", () => {
    expect(plannerScenarioCreateSchema.parse({ termId: "11111111-1111-4111-8111-111111111111", name: "Plan B" })).toMatchObject({ name: "Plan B", profileKey: "default" });
    expect(() => plannerScenarioCreateSchema.parse({ termId: "invalid", name: "Plan B" })).toThrow();
  });

  it("cleans copied selections while retaining only an existing linked subject", () => {
    const linked = normalizeDuplicatedSelectionRow({ alignment: "linked", subject_id: "subject-1", enrollment_id: "enrollment-1", confirmed_enrollment_id: "enrollment-1" }, "scenario-2", "selection-2");
    const created = normalizeDuplicatedSelectionRow({ alignment: "created", subject_id: "subject-2", enrollment_id: "enrollment-2", confirmed_enrollment_id: "enrollment-2" }, "scenario-2", "selection-3");
    expect(linked).toMatchObject({ subject_id: "subject-1", enrollment_id: null, confirmed_enrollment_id: null, alignment: "linked" });
    expect(created).toMatchObject({ subject_id: null, enrollment_id: null, confirmed_enrollment_id: null, alignment: "unresolved" });
  });

  it("rejects an enrollment linked to a different subject", () => {
    expect(selectionReferencesMatch("subject-1", "subject-1")).toBe(true);
    expect(selectionReferencesMatch("subject-1", "subject-2")).toBe(false);
    expect(selectionReferencesMatch(null, "subject-2")).toBe(true);
  });

  it("keeps the compatibility entries field and lifecycle safeguards in the route/service contract", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "app/api/planner/route.ts"), "utf8");
    const service = fs.readFileSync(path.join(process.cwd(), "modules/planning/application/scenarios.ts"), "utf8");
    expect(route).toContain("return NextResponse.json({ ...bundle, entries });");
    expect(service).toContain("Reabrilo explícitamente");
    expect(service).toContain("assertScenarioDraft");
  });

  it("guards RPC retries against duplicate subjects and keeps confirmation idempotent", () => {
    const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/009_planner_scenarios.sql"), "utf8");
    expect(migration).toContain("selection_row.alignment = 'created'");
    expect(migration).toContain("El código de materia ya existe");
    expect(migration).toContain("on conflict (term_id, subject_id) do update");
  });

  it("checks the URL scenario when replacing offer links", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "app/api/planner/scenarios/[id]/selections/[selectionId]/offers/route.ts"), "utf8");
    expect(route).toContain("setPlannerSelectionOffers(selectionId, parsed.data.offerIds, profileFrom(request), id)");
  });
});
