import MonthlySchedule from "@/components/dashboard/monthly-schedule";
import UpcomingEvents from "@/components/dashboard/upcoming-events";
import { getCalendarEvents } from "@/lib/google-calendar";
import {
  getCurrentTerm,
  getEnrollmentsForTerm,
  getEventsForTerm,
  getSubjects
} from "@/lib/queries";
import type { CalendarEvent, Enrollment, EnrollmentScheduleDay, Event } from "@/lib/types";
import { buildEvaluationSections } from "@/lib/dashboard/evaluation-classification";

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

const filterFutureEvents = (events: CalendarEvent[], start: Date, endExclusive: Date) =>
  events.filter((event) => {
    const date = new Date(event.startsAt).getTime();
    return date >= start.getTime() && date < endExclusive.getTime();
  });

export default async function EvaluacionesPage({
  searchParams
}: {
  searchParams: { month?: string }
}) {
  const now = new Date();

  let referenceDate = now;
  if (searchParams.month) {
    const parsed = new Date(`${searchParams.month}-01T00:00:00`);
    if (!isNaN(parsed.getTime())) {
      referenceDate = parsed;
    }
  }

  // Rango para calendario mensual
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const monthEndExclusive = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
  const monthEndInclusive = new Date(monthEndExclusive.getTime() - 1);

  // Rango para agenda extendida (próximos eventos)
  const upcomingEnd = new Date(now.getTime() + 60 * DAY_MS); // Mostrar próximos 2 meses

  const [currentTerm, subjects, calendarMonthRange, upcomingCalendarRange] = await Promise.all([
    getCurrentTerm(),
    getSubjects(),
    getCalendarEvents(monthStart.toISOString(), monthEndInclusive.toISOString()),
    getCalendarEvents(now.toISOString(), upcomingEnd.toISOString())
  ]);

  const [enrollments, termEvents] = currentTerm
    ? await Promise.all([
        getEnrollmentsForTerm(currentTerm.id),
        getEventsForTerm(currentTerm.id)
      ])
    : [[], []];

  // Eventos para el calendario mensual
  const internalMonthEvents = buildInternalEvents(termEvents).filter((event) => {
    const date = new Date(event.startsAt).getTime();
    return date >= monthStart.getTime() && date <= monthEndInclusive.getTime();
  });
  const scheduleMonthEvents = buildScheduleClassEvents(enrollments, monthStart, monthEndExclusive);

  const monthEventsRaw = [...calendarMonthRange, ...internalMonthEvents, ...scheduleMonthEvents];
  const monthEvents = attachSubjectHint(
    monthEventsRaw,
    subjects.map((subject) => ({ name: subject.name, code: subject.code }))
  );
  const monthEvaluationEvents = buildEvaluationSections(monthEvents).flatMap(
    (section) => section.events
  );

  // Eventos para la lista de evaluaciones futuras
  const upcomingInternalEvents = filterFutureEvents(buildInternalEvents(termEvents), now, upcomingEnd);
  const scheduleUpcomingEvents = buildScheduleClassEvents(enrollments, now, upcomingEnd);
  const allUpcomingRaw = [...upcomingCalendarRange, ...upcomingInternalEvents, ...scheduleUpcomingEvents];

  // Attach hints
  const allUpcoming = attachSubjectHint(
    allUpcomingRaw,
    subjects.map((subject) => ({ name: subject.name, code: subject.code }))
  );

  const evaluationSections = buildEvaluationSections(allUpcoming);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Mes actual</p>
          <h1 className="text-xl font-semibold tracking-tight text-text">Evaluaciones y agenda</h1>
        </div>
        <MonthlySchedule events={monthEvaluationEvents} referenceDate={referenceDate} />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">A futuro</p>
          <p className="text-sm text-muted">
            Parciales, recuperatorios, entregas, TPs, finales y defensas. Las clases regulares quedan fuera.
          </p>
        </div>
        {evaluationSections.length === 0 ? (
          <div className="rounded-2xl border border-border/45 bg-surface/70 p-8 text-center text-sm text-muted">
            No hay evaluaciones ni entregas a la vista.
          </div>
        ) : (
          <UpcomingEvents events={allUpcoming} subjectOptions={[]} sections={evaluationSections} />
        )}
      </section>
    </div>
  );
}
