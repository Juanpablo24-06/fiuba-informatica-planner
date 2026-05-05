import { describe, expect, it } from "vitest";
import {
  dedupeWeeklyScheduleEvents,
  getWeeklyScheduleHourBounds
} from "@/lib/dashboard/weekly-schedule";
import type { CalendarEvent } from "@/lib/types";

const buildEvent = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id: overrides.id ?? "event",
  title: overrides.title ?? "Análisis Matemático II",
  startsAt: overrides.startsAt ?? "2026-03-23T11:00:00.000Z",
  endsAt: overrides.endsAt ?? "2026-03-23T13:00:00.000Z",
  source: overrides.source ?? "internal",
  subject: overrides.subject ?? "Análisis Matemático II",
  type: overrides.type ?? "clase",
  color: overrides.color ?? undefined,
  tags: overrides.tags ?? undefined
});

describe("getWeeklyScheduleHourBounds", () => {
  it("falls back to the stable 7 to 22 range when the week has no events yet", () => {
    expect(getWeeklyScheduleHourBounds([])).toEqual({
      startHour: 7,
      endHour: 22
    });
  });

  it("keeps the desktop grid stable when the visible events already fit inside the range", () => {
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
      startHour: 7,
      endHour: 22
    });
  });

  it("expands the range when an event starts before 7 or ends after 22", () => {
    const bounds = getWeeklyScheduleHourBounds([
      buildEvent({
        id: "early",
        startsAt: "2026-03-23T06:30:00.000-03:00",
        endsAt: "2026-03-23T07:30:00.000-03:00"
      }),
      buildEvent({
        id: "late",
        startsAt: "2026-03-23T21:30:00.000-03:00",
        endsAt: "2026-03-23T22:45:00.000-03:00"
      })
    ]);

    expect(bounds).toEqual({
      startHour: 6,
      endHour: 23
    });
  });
});

describe("dedupeWeeklyScheduleEvents", () => {
  it("prefers richer non-generated class events over generated schedule duplicates on the same day", () => {
    const events = dedupeWeeklyScheduleEvents([
      buildEvent({
        id: "schedule-analysis-lun-0800",
        startsAt: "2026-03-23T11:00:00.000Z",
        endsAt: "2026-03-23T14:00:00.000Z",
        tags: ["Cursada"]
      }),
      buildEvent({
        id: "calendar-analysis-lun-0800",
        startsAt: "2026-03-23T11:00:00.000Z",
        endsAt: "2026-03-23T13:00:00.000Z",
        source: "calendar",
        type: undefined,
        tags: ["Aula 101", "Comisión 2"]
      })
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe("calendar-analysis-lun-0800");
  });

  it("keeps genuinely different events even if they share the same subject on the same day", () => {
    const events = dedupeWeeklyScheduleEvents([
      buildEvent({
        id: "schedule-analysis-lun-0800",
        startsAt: "2026-03-23T11:00:00.000Z",
        endsAt: "2026-03-23T13:00:00.000Z"
      }),
      buildEvent({
        id: "schedule-analysis-lun-1600",
        startsAt: "2026-03-23T19:00:00.000Z",
        endsAt: "2026-03-23T21:00:00.000Z"
      })
    ]);

    expect(events).toHaveLength(2);
  });
});
