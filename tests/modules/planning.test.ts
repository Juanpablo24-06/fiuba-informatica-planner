import { describe, expect, it, vi } from "vitest";
import { createPlannerService } from "@/modules/planning/application/scenarios";
import type { PlannerRepository } from "@/modules/planning/application/ports";
import { createPlannerEntryService, type PlannerEntryRepository, type PlannerEntryRecord } from "@/modules/planning/application/entries";
import { termId, subjectId, enrollmentId } from "./academic-fixture";

describe("planning use cases with replaceable persistence", () => {
  it("does not edit a confirmed scenario before reopening it", async () => {
    const updateScenario = vi.fn();
    const repository = { findScenario: vi.fn().mockResolvedValue({ data: { id: "scenario", term_id: termId, lifecycle: "confirmed" }, error: null }), updateScenario } as unknown as PlannerRepository;
    await expect(createPlannerService(repository).updatePlannerScenario("scenario", { name: "Otro nombre" })).rejects.toMatchObject({ status: 409 });
    expect(updateScenario).not.toHaveBeenCalled();
  });
  it("rejects an enrollment from another term before creating a selection", async () => {
    const insertSelection = vi.fn();
    const repository = {
      findScenario: vi.fn().mockResolvedValue({ data: { id: "scenario", term_id: termId, lifecycle: "draft" }, error: null }),
      findSubject: vi.fn().mockResolvedValue({ data: { id: subjectId }, error: null }),
      findEnrollment: vi.fn().mockResolvedValue({ data: { id: enrollmentId, term_id: "another-term", subject_id: subjectId }, error: null }), insertSelection
    } as unknown as PlannerRepository;
    await expect(createPlannerService(repository).createPlannerSelection("scenario", { kind: "course", title: "Algoritmos", subjectId, enrollmentId })).rejects.toMatchObject({ status: 422 });
    expect(insertSelection).not.toHaveBeenCalled();
  });
  it("passes validated alignments and the profile to atomic confirmation", async () => {
    const confirmScenario = vi.fn().mockResolvedValue({ data: { confirmed: true }, error: null });
    const repository = { findScenario: vi.fn().mockResolvedValue({ data: { id: "scenario", lifecycle: "draft" }, error: null }), confirmScenario } as unknown as PlannerRepository;
    expect(await createPlannerService(repository).confirmPlannerScenario("scenario", { alignments: [] }, "juan")).toEqual({ confirmed: true });
    expect(confirmScenario).toHaveBeenCalledWith("scenario", "juan", []);
  });
  it("closes only matching active history and removes future replacements", async () => {
    const entries = [
      { id: "past", subject_code: "61.08", effective_from: "2026-03-01", effective_to: null },
      { id: "future", subject_code: "61.08", effective_from: "2026-06-01", effective_to: null },
      { id: "closed", subject_code: "61.08", effective_from: "2026-02-01", effective_to: "2026-02-28" },
      { id: "other", subject_code: "61.03", effective_from: "2026-03-01", effective_to: null }
    ] as PlannerEntryRecord[];
    const updateEntry = vi.fn().mockResolvedValue(undefined);
    const removeEntries = vi.fn().mockResolvedValue(undefined);
    const repository = { listEntries: vi.fn().mockResolvedValue(entries), updateEntry, removeEntries } as unknown as PlannerEntryRepository;
    await createPlannerEntryService(repository, () => new Date("2026-10-03T12:00:00Z")).closeEntries(termId, { name: "Algoritmos", code: "61.08" }, "2026-04-01");
    expect(updateEntry).toHaveBeenCalledExactlyOnceWith("past", { effective_to: "2026-03-31", updated_at: "2026-10-03T12:00:00.000Z" });
    expect(removeEntries).toHaveBeenCalledExactlyOnceWith(["future"]);
  });
});
