import MonthlySchedule from "@/components/dashboard/monthly-schedule";
import UpcomingEvents from "@/components/dashboard/upcoming-events";
import WeeklySchedule from "@/components/dashboard/weekly-schedule";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getCalendarEventEnrichments } from "@/lib/ai/queries";
import { getWeekRange } from "@/lib/date";
import { getCalendarEvents } from "@/lib/google-calendar";
import {
  getCurrentTerm,
  getEnrollmentsForTerm,
  getEventsForTerm,
  getSubjects,
  getUpcomingEvents
} from "@/lib/queries";
import type { CalendarEvent, Enrollment, EnrollmentScheduleDay, Event } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const SCHEDULE_DAY_TO_WEEKDAY: Record<EnrollmentScheduleDay, number> = {
  lun: 1,
  mar: 2,
  mie: 3,
  jue: 4,
  vie: 5,
  sab: 6
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

const attachSubjectHint = (
  events: CalendarEvent[],
  subjects: { name: string; code?: string | null }[]
) =>
  events.map((event) => {
    if (event.subject) return event;
    const match = subjects.find((subject) =>
      [subject.name, subject.code]
        .filter(Boolean)
        .some((token) => event.title.toLowerCase().includes((token ?? "").toLowerCase()))
    );
    return match ? { ...event, subject: match.name } : event;
  });

const KIND_LABELS: Record<string, string> = {
  exam: "Parcial",
  class: "Clase",
  tp: "TP",
  final: "Final",
  meeting: "Reunión",
  other: "Evento",
  unknown: "Revisar"
};

const formatInstance = (value?: string | null) => {
  if (!value) return "";
  if (value === "recup") return "Recup";
  return value;
};

const buildEnrichmentTags = (enrichment: {
  kind: string | null;
  instance: string | null;
  tags: string[] | null;
}) => {
  if (enrichment.tags && enrichment.tags.length) return enrichment.tags;
  if (!enrichment.kind) return [];
  const kindLabel = KIND_LABELS[enrichment.kind] ?? enrichment.kind;
  const instance = formatInstance(enrichment.instance);
  return [`${kindLabel}${instance ? ` ${instance}` : ""}`];
};

export default async function HorarioPage() {
  const now = new Date();
  const upcomingEnd = new Date(now.getTime() + 14 * DAY_MS);
  const weekRange = getWeekRange(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEndExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEndInclusive = new Date(monthEndExclusive.getTime() - 1);
  const [currentTerm, subjects, calendarRange, calendarMonthRange] = await Promise.all([
    getCurrentTerm(),
    getSubjects(),
    getCalendarEvents(now.toISOString(), upcomingEnd.toISOString()),
    getCalendarEvents(monthStart.toISOString(), monthEndInclusive.toISOString())
  ]);
  const [enrollments, termEvents, upcomingInternal] = currentTerm
    ? await Promise.all([
        getEnrollmentsForTerm(currentTerm.id),
        getEventsForTerm(currentTerm.id),
        getUpcomingEvents(currentTerm.id)
      ])
    : [[], [], []];
  const calendarWeekEvents = calendarRange.filter((event) => {
    const date = new Date(event.startsAt).getTime();
    return date >= weekRange.start.getTime() && date < weekRange.end.getTime();
  });

  const internalCalendarEvents = buildInternalEvents(termEvents).filter((event) => {
    const date = new Date(event.startsAt).getTime();
    return date >= weekRange.start.getTime() && date < weekRange.end.getTime();
  });
  const internalMonthEvents = buildInternalEvents(termEvents).filter((event) => {
    const date = new Date(event.startsAt).getTime();
    return date >= monthStart.getTime() && date <= monthEndInclusive.getTime();
  });
  const scheduleWeekEvents = buildScheduleClassEvents(
    enrollments,
    weekRange.start,
    weekRange.end
  );
  const scheduleMonthEvents = buildScheduleClassEvents(
    enrollments,
    monthStart,
    monthEndExclusive
  );
  const scheduleUpcomingEvents = buildScheduleClassEvents(enrollments, now, upcomingEnd);

  const scheduleEvents = [...calendarWeekEvents, ...internalCalendarEvents, ...scheduleWeekEvents];

  let enrichmentMap = new Map();
  try {
    enrichmentMap = await getCalendarEventEnrichments(scheduleEvents.map((event) => event.id));
  } catch (error) {
    enrichmentMap = new Map();
  }

  const enrichedScheduleEvents = scheduleEvents.map((event) => {
    const enrichment = enrichmentMap.get(event.id);
    if (!enrichment || enrichment.needsReview) return event;
    const tags = buildEnrichmentTags(enrichment);
    return tags.length ? { ...event, tags } : event;
  });

  const upcomingEvents = attachSubjectHint(
    [...calendarRange, ...buildInternalEvents(upcomingInternal), ...scheduleUpcomingEvents],
    subjects.map((subject) => ({ name: subject.name, code: subject.code }))
  );
  const monthEvents = attachSubjectHint(
    [...calendarMonthRange, ...internalMonthEvents, ...scheduleMonthEvents],
    subjects.map((subject) => ({ name: subject.name, code: subject.code }))
  );

  const subjectOptions = Array.from(
    new Set(
      [...upcomingEvents, ...enrichedScheduleEvents]
        .map((event) => event.subject)
        .filter(Boolean)
    )
  ) as string[];

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-muted">Horario</p>
        <h1 className="mt-2 text-3xl font-semibold text-text">Agenda semanal y mensual</h1>
        <p className="mt-2 text-sm text-muted">
          Vista integrada de Google Calendar + eventos internos + horarios de cursada.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Semana actual</p>
              <h2 className="text-lg font-semibold">Horario semanal</h2>
            </div>
          </CardHeader>
          <CardBody>
            <WeeklySchedule events={enrichedScheduleEvents} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Esta semana</p>
              <h2 className="text-lg font-semibold">Exámenes y entregas</h2>
            </div>
          </CardHeader>
          <CardBody>
            <UpcomingEvents
              events={enrichedScheduleEvents}
              subjectOptions={subjectOptions}
              compactByDay
            />
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Mes actual</p>
            <h2 className="text-lg font-semibold">Calendario mensual</h2>
          </div>
        </CardHeader>
        <CardBody>
          <MonthlySchedule events={monthEvents} referenceDate={now} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Próximos 14 días</p>
            <h2 className="text-lg font-semibold">Agenda extendida</h2>
          </div>
        </CardHeader>
        <CardBody>
          <UpcomingEvents events={upcomingEvents} subjectOptions={subjectOptions} />
        </CardBody>
      </Card>
    </div>
  );
}
