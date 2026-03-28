import WeeklySchedule from "@/components/dashboard/weekly-schedule";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getCalendarEventEnrichments } from "@/lib/ai/queries";
import { dedupeWeeklyScheduleEvents } from "@/lib/dashboard/weekly-schedule";
import { getWeekRange } from "@/lib/date";
import { getCalendarEvents } from "@/lib/google-calendar";
import { getCurrentTerm, getEnrollmentsForTerm, getEventsForTerm } from "@/lib/queries";
import type { CalendarEvent, Enrollment, EnrollmentScheduleDay, Event } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const SCHEDULE_DAY_TO_WEEKDAY: Record<EnrollmentScheduleDay, number> = {
  lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6
};

const buildInternalEvents = (events: Event[]): CalendarEvent[] =>
  events.map((event) => ({
    id: event.id,
    title: event.title ?? event.type,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    source: "internal",
    subject: event.enrollment?.subject?.name,
    type: event.type,
    color: event.enrollment?.color ?? undefined
  }));

const buildScheduleClassEvents = (
  enrollments: Enrollment[],
  rangeStart: Date,
  rangeEndExclusive: Date
): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  const start = new Date(rangeStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(rangeEndExclusive);
  end.setHours(0, 0, 0, 0);

  for (const enrollment of enrollments) {
    if (!enrollment.schedule?.length) continue;
    for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
      const weekday = ((cursor.getDay() + 6) % 7) + 1;
      const dateKey = cursor.toISOString().slice(0, 10);
      for (const slot of enrollment.schedule) {
        if (SCHEDULE_DAY_TO_WEEKDAY[slot.day] !== weekday) continue;
        const [startHour, startMinute] = slot.start_time.split(":").map(Number);
        const [endHour, endMinute] = slot.end_time.split(":").map(Number);
        const startsAt = new Date(cursor);
        startsAt.setHours(startHour, startMinute, 0, 0);
        const endsAt = new Date(cursor);
        endsAt.setHours(endHour, endMinute, 0, 0);
        if (endsAt.getTime() <= startsAt.getTime()) {
          endsAt.setDate(endsAt.getDate() + 1);
        }
        const location = slot.location?.trim();
        events.push({
          id: `schedule-${enrollment.id}-${slot.day}-${slot.start_time}-${dateKey}`,
          title: enrollment.subject.name,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          source: "internal",
          subject: enrollment.subject.name,
          type: "clase",
          color: enrollment.color ?? undefined,
          tags: location ? ["Cursada", location] : ["Cursada"]
        });
      }
    }
  }
  return events;
};

const KIND_LABELS: Record<string, string> = {
  exam: "Parcial", class: "Clase", tp: "TP", final: "Final", meeting: "Reunión", other: "Evento", unknown: "Revisar"
};
const formatInstance = (value?: string | null) => {
  if (!value) return "";
  if (value === "recup") return "Recup";
  return value;
};
const buildEnrichmentTags = (enrichment: { kind: string | null; instance: string | null; tags: string[] | null; }) => {
  if (enrichment.tags && enrichment.tags.length) return enrichment.tags;
  if (!enrichment.kind) return [];
  const kindLabel = KIND_LABELS[enrichment.kind] ?? enrichment.kind;
  const instance = formatInstance(enrichment.instance);
  return [`${kindLabel}${instance ? ` ${instance}` : ""}`];
};

export default async function SemanaPage() {
  const now = new Date();

  const weekRange = getWeekRange(now);
  const upcomingEnd = new Date(now.getTime() + 14 * DAY_MS);

  const [currentTerm, calendarRange] = await Promise.all([
    getCurrentTerm(),
    getCalendarEvents(weekRange.start.toISOString(), upcomingEnd.toISOString())
  ]);

  const [enrollments, termEvents] = currentTerm
    ? await Promise.all([
        getEnrollmentsForTerm(currentTerm.id),
        getEventsForTerm(currentTerm.id)
      ])
    : [[], []];

  const calendarWeekEvents = calendarRange.filter((event) => {
    const date = new Date(event.startsAt).getTime();
    return date >= weekRange.start.getTime() && date < weekRange.end.getTime();
  });

  const internalCalendarEvents = buildInternalEvents(termEvents).filter((event) => {
    const date = new Date(event.startsAt).getTime();
    return date >= weekRange.start.getTime() && date < weekRange.end.getTime();
  });

  const scheduleWeekEvents = buildScheduleClassEvents(
    enrollments,
    weekRange.start,
    weekRange.end
  );

  const scheduleEvents = [...calendarWeekEvents, ...internalCalendarEvents, ...scheduleWeekEvents];

  let enrichmentMap = new Map();
  try {
    enrichmentMap = await getCalendarEventEnrichments(scheduleEvents.map((event) => event.id));
  } catch {
    enrichmentMap = new Map();
  }

  const enrichedScheduleEvents = scheduleEvents.map((event) => {
    const enrichment = enrichmentMap.get(event.id);
    if (!enrichment || enrichment.needsReview) return event;
    const tags = buildEnrichmentTags(enrichment);
    return tags.length ? { ...event, tags } : event;
  });
  const dedupedScheduleEvents = dedupeWeeklyScheduleEvents(enrichedScheduleEvents);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Semana actual</p>
        </CardHeader>
        <CardBody>
          <WeeklySchedule events={dedupedScheduleEvents} />
        </CardBody>
      </Card>
    </div>
  );
}
