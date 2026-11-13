import { beforeEach, describe, expect, it, vi } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));

import { listEvents, updateEvent } from "@/lib/admin/events";
import { createEnrollment, updateEnrollment } from "@/lib/admin/enrollments";
import { updateTerm } from "@/lib/admin/terms";
import { isMissingEnrollmentScheduleColumn } from "@/lib/enrollment-select";
import { getEventsForTerm, getUpcomingEvents } from "@/lib/queries";

const resultQuery = (result: { data: unknown; error: unknown }) => {
  const query = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn(), order: vi.fn(), gte: vi.fn(), lte: vi.fn(),
    single: vi.fn().mockResolvedValue(result), maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve)
  };
  for (const method of [query.select, query.insert, query.update, query.eq, query.order, query.gte, query.lte]) {
    method.mockReturnValue(query);
  }
  return query;
};

beforeEach(() => { from.mockReset(); });

describe("data access regressions", () => {
  const missingSchedule = { code: "PGRST204", message: "Could not find the 'schedule' column of 'enrollments' in the schema cache" };

  it("distinguishes a missing schedule column from unrelated database errors", () => {
    expect(isMissingEnrollmentScheduleColumn(missingSchedule)).toBe(true);
    expect(isMissingEnrollmentScheduleColumn({ code: "42703", message: "column subjects.notes does not exist" })).toBe(false);
    expect(isMissingEnrollmentScheduleColumn({ code: "PGRST204", message: "Could not find the 'color' column" })).toBe(false);
    expect(isMissingEnrollmentScheduleColumn({ code: "42703", message: "column enrollments.schedule does not exist" })).toBe(true);
  });

  it.each([true, false])("filters parent events by term even with schedule support=%s", async (withSchedule) => {
    if (!withSchedule) from.mockReturnValueOnce(resultQuery({ data: null, error: missingSchedule }));
    const query = resultQuery({ data: [], error: null });
    from.mockReturnValueOnce(query);
    await listEvents({ termId: "term-1" });
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("enrollment:enrollments!inner("));
    expect(query.eq).toHaveBeenCalledWith("enrollment.term_id", "term-1");
  });

  it("preserves unfiltered event queries", async () => {
    const query = resultQuery({ data: [], error: null });
    from.mockReturnValue(query);
    await listEvents({});
    expect(query.select).toHaveBeenCalledWith(expect.not.stringContaining("!inner"));
  });

  it.each([getEventsForTerm, getUpcomingEvents])("filters dashboard event queries by term (%#)", async (load) => {
    const query = resultQuery({ data: [], error: null });
    from.mockReturnValue(query);
    await load("term-1");
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("enrollment:enrollments!inner("));
    expect(query.eq).toHaveBeenCalledWith("enrollment.term_id", "term-1");
  });

  it("filters dashboard events by term when retrying without schedule", async () => {
    from.mockReturnValueOnce(resultQuery({ data: null, error: missingSchedule }));
    const query = resultQuery({ data: [], error: null });
    from.mockReturnValueOnce(query);
    await getEventsForTerm("term-1");
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("enrollment:enrollments!inner("));
  });

  it("does not retry and silently discard a schedule when creating an enrollment", async () => {
    from.mockReturnValueOnce(resultQuery({ data: null, error: missingSchedule }));
    await expect(createEnrollment({
      term_id: "123e4567-e89b-12d3-a456-426614174000", subject_id: "123e4567-e89b-12d3-a456-426614174001", status: "cursando",
      schedule: [{ day: "lun", start_time: "19:00", end_time: "21:00" }]
    })).rejects.toMatchObject({ status: 409 });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("does not partially save an update while losing its schedule", async () => {
    from.mockReturnValueOnce(resultQuery({ data: null, error: missingSchedule }));
    await expect(updateEnrollment("enrollment", {
      notes: "Keep both changes", schedule: [{ day: "lun", start_time: "19:00", end_time: "21:00" }]
    })).rejects.toMatchObject({ status: 409 });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("keeps the compatibility fallback for an enrollment with no schedule", async () => {
    from.mockReturnValueOnce(resultQuery({ data: null, error: missingSchedule }));
    const retry = resultQuery({ data: { id: "enrollment" }, error: null });
    from.mockReturnValueOnce(retry);
    await expect(createEnrollment({ term_id: "123e4567-e89b-12d3-a456-426614174000", subject_id: "123e4567-e89b-12d3-a456-426614174001", status: "cursando" }))
      .resolves.toEqual({ id: "enrollment", schedule: [] });
    expect(retry.insert).toHaveBeenCalledWith({ term_id: "123e4567-e89b-12d3-a456-426614174000", subject_id: "123e4567-e89b-12d3-a456-426614174001", status: "cursando" });
  });

  it.each([
    { starts_at: "2026-04-10T22:00:00Z" },
    { ends_at: "2026-04-10T18:00:00Z" }
  ])("validates partial event date updates against stored dates: %j", async (patch) => {
    from.mockReturnValueOnce(resultQuery({ data: {
      starts_at: "2026-04-10T19:00:00Z", ends_at: "2026-04-10T21:00:00Z"
    }, error: null }));
    await expect(updateEvent("event", patch)).rejects.toMatchObject({ status: 400 });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("validates partial term updates before changing the current term", async () => {
    from.mockReturnValueOnce(resultQuery({ data: { start_date: "2026-03-10", end_date: "2026-07-15" }, error: null }));
    await expect(updateTerm("123e4567-e89b-12d3-a456-426614174000", { start_date: "2026-08-01", is_current: true })).rejects.toMatchObject({ status: 400 });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("does not clear the current term when the requested target does not exist", async () => {
    const query = resultQuery({ data: null, error: null });
    from.mockReturnValueOnce(query);
    await expect(updateTerm("missing-term", { is_current: true })).resolves.toBeNull();
    expect(query.update).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledTimes(1);
  });
});
