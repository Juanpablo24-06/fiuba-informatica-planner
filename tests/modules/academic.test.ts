import { describe, expect, it } from "vitest";
import { makeAcademicFixture, termId, subjectId, enrollmentId, eventId, subjectFixture } from "./academic-fixture";

describe("academic use cases with in-memory repositories", () => {
  it("validates a partial term range before clearing the current term", async () => {
    const fixture = makeAcademicFixture();
    await expect(fixture.service.updateTerm(termId, { start_date: "2026-08-01", is_current: true })).rejects.toMatchObject({ status: 400 });
    expect(fixture.termRepository.clearCurrent).not.toHaveBeenCalled();
    expect(fixture.termRepository.update).not.toHaveBeenCalled();
    expect(fixture.terms.get(termId)?.is_current).toBe(true);
  });
  it("does not clear the current term when the target is missing", async () => {
    const fixture = makeAcademicFixture();
    expect(await fixture.service.updateTerm("missing", { is_current: true })).toBeNull();
    expect(fixture.termRepository.clearCurrent).not.toHaveBeenCalled();
  });
  it("normalizes input and shares the current-term rule for creation", async () => {
    const fixture = makeAcademicFixture();
    const saved = await fixture.service.createTerm({ label: " 2026-2 ", is_current: true });
    expect(saved?.label).toBe("2026-2");
    expect([...fixture.terms.values()].filter((term) => term.is_current)).toHaveLength(1);
    expect(fixture.terms.get(termId)?.is_current).toBe(false);
  });
  it("rejects an invalid create before calling persistence", async () => {
    const fixture = makeAcademicFixture();
    await expect(fixture.service.createEnrollment({ term_id: termId, subject_id: subjectId, status: "cursando", schedule: [{ day: "lun", start_time: "19:00", end_time: "18:00" }] })).rejects.toMatchObject({ status: 400 });
    expect(fixture.enrollmentRepository.create).not.toHaveBeenCalled();
  });
  it("checks event date patches against the persisted event", async () => {
    const fixture = makeAcademicFixture();
    await expect(fixture.service.updateEvent(eventId, { starts_at: "2026-04-10T22:00:00Z" })).rejects.toMatchObject({ status: 400 });
    expect(fixture.eventRepository.update).not.toHaveBeenCalled();
    await fixture.service.updateEvent(eventId, { ends_at: null });
    expect(fixture.events.get(eventId)?.ends_at).toBeNull();
  });
  it("rejects a reversed event with offsets before creating it", async () => {
    const fixture = makeAcademicFixture();
    await expect(fixture.service.createEvent({ enrollment_id: enrollmentId, type: "parcial", starts_at: "2026-04-10T19:00:00-03:00", ends_at: "2026-04-10T21:00:00Z" })).rejects.toMatchObject({ status: 400 });
    expect(fixture.eventRepository.create).not.toHaveBeenCalled();
  });
  it("archives and restores subjects without deleting their data", async () => {
    const fixture = makeAcademicFixture();
    await fixture.service.deleteSubject(subjectId);
    expect(await fixture.service.listSubjects()).toEqual([]);
    expect(await fixture.service.listDeletedSubjects()).toHaveLength(1);
    await fixture.service.restoreSubject(subjectId);
    expect(await fixture.service.listSubjects()).toHaveLength(1);
  });
  it("preserves unlocks and drops inactive prerequisite references", async () => {
    const fixture = makeAcademicFixture();
    const otherId = "123e4567-e89b-12d3-a456-426614174010";
    fixture.subjects.set(otherId, subjectFixture(otherId));
    fixture.relations.set(subjectId, { prerequisiteIds: [], unlockIds: [otherId] });
    expect(await fixture.service.replaceSubjectPrerequisites(subjectId, [otherId, otherId, "missing"])).toEqual({ prerequisiteIds: [otherId], unlockIds: [otherId] });
  });
  it("preserves schedules while updating enrollment metadata", async () => {
    const fixture = makeAcademicFixture();
    fixture.enrollments.get(enrollmentId)!.schedule = [{ day: "lun", start_time: "19:00", end_time: "21:00", location: null }];
    await fixture.service.updateEnrollment(enrollmentId, { notes: "Nuevo apunte" });
    expect(fixture.enrollments.get(enrollmentId)?.schedule).toHaveLength(1);
  });
});
