import { describe, expect, it } from "vitest";
import { getWeeklyScheduleHourBounds } from "@/lib/dashboard/weekly-schedule";
import type { CalendarEvent } from "@/lib/types";

const buildEvent = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id: overrides.id ?? "event",
  title: overrides.title ?? "Análisis Matemático II",
  startsAt: overrides.startsAt ?? "2026-03-23T11:00:00.000Z",
  endsAt: overrides.endsAt ?? "2026-03-23T13:00:00.000Z",
  source: overrides.source ?? "internal",
  subject: overrides.subject ?? "Análisis Matemático II",
  type: overrides.type ?? "clase",
  color: overrides.color ?? null,
  tags: overrides.tags ?? null
});

describe("getWeeklyScheduleHourBounds", () => {
  it("falls back to the full default range when the week has no events yet", () => {
    expect(getWeeklyScheduleHourBounds([])).toEqual({
      startHour: 8,
      endHour: 22
    });
  });

  it("tightens the desktop grid to the hours that actually contain activity", () => {
    const bounds = getWeeklyScheduleHourBounds([
      buildEvent({
        id: "monday",
        startsAt: "2026-03-23T11:00:00.000Z",
        endsAt: "2026-03-23T13:00:00.000Z"
      }),
      buildEvent({
        id: "tuesday",
        startsAt: "2026-03-24T11:00:00.000Z",
        endsAt: "2026-03-24T14:00:00.000Z"
      })
    ]);

    expect(bounds).toEqual({
      startHour: 8,
      endHour: 11
    });
  });
});
