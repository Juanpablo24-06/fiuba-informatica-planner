import MonthlySchedule from "@/components/dashboard/monthly-schedule";
import UpcomingEvents from "@/components/dashboard/upcoming-events";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
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

  const [enrollments, termEvents, upcomingInternal] = currentTerm
    ? await Promise.all([
        getEnrollmentsForTerm(currentTerm.id),
        getEventsForTerm(currentTerm.id),
        getUpcomingEvents(currentTerm.id)
      ])
    : [[], [], []];

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

  // Eventos para la lista de fechas importantes (solo TPs, Parciales, etc.)
  // We filter out classes from the upcoming list so it's only deliverables/exams
  const scheduleUpcomingEvents = buildScheduleClassEvents(enrollments, now, upcomingEnd);
  const allUpcomingRaw = [...upcomingCalendarRange, ...buildInternalEvents(upcomingInternal), ...scheduleUpcomingEvents];

  // Attach hints
  const allUpcoming = attachSubjectHint(
    allUpcomingRaw,
    subjects.map((subject) => ({ name: subject.name, code: subject.code }))
  );

  // Filter for important events
  const importantUpcoming = allUpcoming.filter(ev => {
    const title = ev.title.toLowerCase();
    const isImportant = title.includes('parcial') ||
                        title.includes('tp') ||
                        title.includes('entrega') ||
                        title.includes('final') ||
                        title.includes('recuperatorio') ||
                        ev.type === 'exam' ||
                        ev.type === 'tp';
    // Exclude regular classes
    if (ev.type === 'clase' && !isImportant) return false;
    return isImportant;
  });

  const subjectOptions = Array.from(
    new Set(allUpcoming.map((event) => event.subject).filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Mes actual</p>
            </CardHeader>
            <CardBody>
              <MonthlySchedule events={monthEvents} referenceDate={referenceDate} />
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">A futuro</p>
            </CardHeader>
            <CardBody>
              <div className="lg:hidden">
                {importantUpcoming.length === 0 ? (
                  <div className="rounded-xl border border-border/40 bg-surface-2/30 p-8 text-center">
                    <p className="text-sm text-muted">No hay exámenes ni entregas a la vista.</p>
                  </div>
                ) : (
                  <UpcomingEvents
                    events={importantUpcoming}
                    subjectOptions={subjectOptions}
                    compactByDay
                  />
                )}
              </div>
              <div className="hidden lg:block">
                {importantUpcoming.length === 0 ? (
                  <div className="rounded-xl border border-border/40 bg-surface-2/30 p-8 text-center">
                    <p className="text-sm text-muted">No hay exámenes ni entregas a la vista.</p>
                  </div>
                ) : (
                  <UpcomingEvents events={importantUpcoming} subjectOptions={subjectOptions} />
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
