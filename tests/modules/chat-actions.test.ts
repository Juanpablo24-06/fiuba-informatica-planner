import { describe, expect, it, vi } from "vitest";
import { createAdminActionService } from "@/modules/chat/application/admin-actions";
import type { PlannerEntryService } from "@/modules/planning/application/entries";
import { makeAcademicFixture, termId, eventId } from "./academic-fixture";

const setup = () => {
  const fixture = makeAcademicFixture();
  const planning = { closeEntries: vi.fn(), setCommission: vi.fn() } as unknown as PlannerEntryService;
  return { ...fixture, planning, actions: createAdminActionService(fixture.service, planning) };
};
describe("chat actions reuse academic use cases", () => {
  it("rejects the same invalid partial term change as the admin service", async () => {
    const fixture = setup();
    const results = await fixture.actions.executeAdminActions([{ type: "update_term", term_label: "2026-1", start_date: "2026-08-01", is_current: true }]);
    expect(results[0].ok).toBe(false);
    expect(fixture.termRepository.update).not.toHaveBeenCalled();
    expect(fixture.terms.get(termId)?.is_current).toBe(true);
  });
  it("rejects partial event changes using persisted dates", async () => {
    const fixture = setup();
    const results = await fixture.actions.executeAdminActions([{ type: "update_event", term_label: "2026-1", subject_query: "Algoritmos", event_query: "Parcial 1", ends_at: "2026-04-10T18:00:00Z" }]);
    expect(results[0].ok).toBe(false);
    expect(fixture.eventRepository.update).not.toHaveBeenCalled();
    expect(fixture.events.get(eventId)?.ends_at).toBe("2026-04-10T21:00:00Z");
  });
  it("can create a subject and enroll it in the same batch", async () => {
    const fixture = setup();
    const results = await fixture.actions.executeAdminActions([{ type: "create_subject", name: "Álgebra", code: "61.03" }, { type: "add_enrollment", term_label: "2026-1", subject_query: "Álgebra", status: "cursando" }]);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(fixture.subjects.size).toBe(2);
    expect(fixture.enrollments.size).toBe(2);
  });
  it("continues independent actions after a rejected mutation", async () => {
    const fixture = setup();
    const results = await fixture.actions.executeAdminActions([{ type: "update_term", term_label: "missing", is_current: true }, { type: "create_term", term_label: "2026-2" }]);
    expect(results.map((result) => result.ok)).toEqual([false, true]);
  });
  it("keeps another current term when updating a non-current term to false", async () => {
    const fixture = setup();
    const other = await fixture.service.createTerm({ label: "2026-2" });
    await fixture.actions.executeAdminActions([{ type: "update_term", term_label: other!.label, is_current: false }, { type: "update_term", term_label: "2026-1", end_date: "2026-07-16" }]);
    expect(fixture.terms.get(termId)?.is_current).toBe(true);
  });
  it("rejects invalid explicit planning dates instead of replacing them with today", async () => {
    const fixture = setup();
    const results = await fixture.actions.executeAdminActions([{ type: "remove_planner_course", term_label: "2026-1", subject_query: "Algoritmos", effective_from: "invalid" }]);
    expect(results[0].ok).toBe(false);
    expect(fixture.planning.closeEntries).not.toHaveBeenCalled();
  });
});
