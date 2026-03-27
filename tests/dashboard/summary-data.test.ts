import { describe, expect, it } from "vitest";
import type { CalendarEvent, Event } from "@/lib/types";
import {
  buildInternalEvents,
  calcLoad,
  getNextFutureEventByEnrollment,
  getUpcomingMergedEvents,
  splitSchedulePreview
} from "@/lib/dashboard/summary-data";

describe("dashboard summary data helpers", () => {
  it("splits a schedule preview into the visible parts", () => {
    const preview = "Lun/Jue 08:00-10:00 · Mar 10:00-12:00";

    expect(splitSchedulePreview(preview)).toEqual({
      days: "Lun/Jue",
      time: "08:00-10:00 · Mar 10:00-12:00"
    });
  });

  it("builds internal events without changing the visible fields", () => {
    const events: Event[] = [
      {
        id: "event-1",
        enrollment_id: "enrollment-1",
        type: "parcial",
        title: "Parcial 1",
        description: null,
        starts_at: "2026-03-28T10:00:00.000Z",
        ends_at: null,
        status: null,
        grade: null,
        attempt: null,
        links: null,
        enrollment: {
          id: "enrollment-1",
          term_id: "term-1",
          subject_id: "subject-1",
          status: "cursando",
          color: "#112233",
          notes: null,
          schedule: [],
          subject: {
            id: "subject-1",
            code: "61.05",
            name: "Matematica",
            credits: 6,
            weekly_hours: 6,
            total_hours: 96,
            term_suggested: 2,
            cycle: null,
            type: "obligatoria",
            requirements: null,
            template: null
          },
          term: null
        }
      }
    ];

    expect(buildInternalEvents(events)).toEqual<CalendarEvent[]>([
      {
        id: "event-1",
        title: "Parcial 1",
        startsAt: "2026-03-28T10:00:00.000Z",
        endsAt: null,
        source: "internal",
        subject: "Matematica",
        type: "parcial",
        color: "#112233"
      }
    ]);
  });

  it("keeps only future events when building the merged dashboard list", () => {
    const now = new Date("2026-03-26T12:00:00.000Z");

    const calendarEvents: CalendarEvent[] = [
      {
        id: "calendar-past",
        title: "Evento pasado",
        startsAt: "2026-03-24T12:00:00.000Z",
        endsAt: null,
        source: "calendar"
      },
      {
        id: "calendar-future",
        title: "Evento futuro",
        startsAt: "2026-03-27T12:00:00.000Z",
        endsAt: null,
        source: "calendar"
      }
    ];

    const internalEvents: Event[] = [
      {
        id: "internal-past",
        enrollment_id: "enrollment-1",
        type: "final",
        title: "Final pasado",
        description: null,
        starts_at: "2026-03-25T12:00:00.000Z",
        ends_at: null,
        status: null,
        grade: null,
        attempt: null,
        links: null
      },
      {
        id: "internal-future",
        enrollment_id: "enrollment-1",
        type: "final",
        title: "Final futuro",
        description: null,
        starts_at: "2026-03-29T12:00:00.000Z",
        ends_at: null,
        status: null,
        grade: null,
        attempt: null,
        links: null
      }
    ];

    expect(
      getUpcomingMergedEvents({
        calendarEvents,
        internalEvents,
        now,
        limit: 4
      }).map((event) => event.id)
    ).toEqual(["calendar-future", "internal-future"]);
  });

  it("returns all future events when no visual limit is requested", () => {
    const now = new Date("2026-03-26T12:00:00.000Z");

    const calendarEvents: CalendarEvent[] = Array.from({ length: 3 }, (_, index) => ({
      id: `calendar-${index}`,
      title: `Calendar ${index}`,
      startsAt: `2026-03-2${7 + index}T12:00:00.000Z`,
      endsAt: null,
      source: "calendar"
    }));

    const internalEvents: Event[] = Array.from({ length: 2 }, (_, index) => ({
      id: `internal-${index}`,
      enrollment_id: `enrollment-${index}`,
      type: "parcial",
      title: `Internal ${index}`,
      description: null,
      starts_at: `2026-04-0${index + 1}T12:00:00.000Z`,
      ends_at: null,
      status: null,
      grade: null,
      attempt: null,
      links: null
    }));

    expect(
      getUpcomingMergedEvents({
        calendarEvents,
        internalEvents,
        now
      }).map((event) => event.id)
    ).toEqual([
      "calendar-0",
      "calendar-1",
      "calendar-2",
      "internal-0",
      "internal-1"
    ]);
  });

  it("chooses the next future event per enrollment", () => {
    const now = new Date("2026-03-26T12:00:00.000Z");
    const events: Event[] = [
      {
        id: "past",
        enrollment_id: "enrollment-1",
        type: "parcial",
        title: "Parcial viejo",
        description: null,
        starts_at: "2026-03-20T12:00:00.000Z",
        ends_at: null,
        status: null,
        grade: null,
        attempt: null,
        links: null
      },
      {
        id: "future-1",
        enrollment_id: "enrollment-1",
        type: "parcial",
        title: "Parcial cercano",
        description: null,
        starts_at: "2026-03-27T12:00:00.000Z",
        ends_at: null,
        status: null,
        grade: null,
        attempt: null,
        links: null
      },
      {
        id: "future-2",
        enrollment_id: "enrollment-1",
        type: "final",
        title: "Final posterior",
        description: null,
        starts_at: "2026-04-05T12:00:00.000Z",
        ends_at: null,
        status: null,
        grade: null,
        attempt: null,
        links: null
      },
      {
        id: "future-other",
        enrollment_id: "enrollment-2",
        type: "parcial",
        title: "Otro parcial",
        description: null,
        starts_at: "2026-03-28T12:00:00.000Z",
        ends_at: null,
        status: null,
        grade: null,
        attempt: null,
        links: null
      }
    ];

    expect(
      [...getNextFutureEventByEnrollment(events, now).entries()].map(([enrollmentId, event]) => [
        enrollmentId,
        event?.id ?? null
      ])
    ).toEqual([
      ["enrollment-1", "future-1"],
      ["enrollment-2", "future-other"]
    ]);
  });

  it("classifies a busy next week as alta", () => {
    const now = new Date("2026-03-26T12:00:00.000Z");
    const events: CalendarEvent[] = [
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `event-${index}`,
        title: `Evento ${index}`,
        startsAt: `2026-03-27T0${index}:00:00.000Z`,
        endsAt: null,
        source: "calendar" as const
      })),
      {
        id: "parcial-1",
        title: "Parcial 1",
        startsAt: "2026-03-28T10:00:00.000Z",
        endsAt: null,
        source: "calendar" as const,
        type: "parcial"
      },
      {
        id: "final-1",
        title: "Final 1",
        startsAt: "2026-03-29T10:00:00.000Z",
        endsAt: null,
        source: "calendar" as const,
        type: "final"
      }
    ];

    expect(calcLoad(events, now)).toEqual({
      label: "Alta",
      mood: "Modo parciales activado",
      level: "alta",
      weekEvents: 10,
      exams: 2
    });
  });
});
