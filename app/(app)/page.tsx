import ActiveSubjects from "@/components/dashboard/active-subjects";
import EventManager from "@/components/dashboard/event-manager";
import TermManager from "@/components/dashboard/term-manager";
import UpcomingEvents from "@/components/dashboard/upcoming-events";
import WeeklySchedule from "@/components/dashboard/weekly-schedule";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google-calendar";
import { getAllEvents, getCurrentTerm, getEnrollmentsForTerm, getEventsForTerm, getSubjects, getTerms, getUpcomingEvents } from "@/lib/queries";
import { getWeekRange } from "@/lib/date";
import type { CalendarEvent, Event } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

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

export default async function DashboardPage() {
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const currentTerm = await getCurrentTerm();
  const terms = await getTerms();
  const subjects = await getSubjects();
  const enrollments = currentTerm ? await getEnrollmentsForTerm(currentTerm.id) : [];
  const termEvents = currentTerm ? await getEventsForTerm(currentTerm.id) : [];
  const allEvents = await getAllEvents();
  const upcomingInternal = currentTerm ? await getUpcomingEvents(currentTerm.id) : [];

  const now = new Date();
  const calendarRange = await getCalendarEvents(
    now.toISOString(),
    new Date(now.getTime() + 14 * DAY_MS).toISOString()
  );

  const weekRange = getWeekRange(now);
  const calendarWeekEvents = calendarRange.filter((event) => {
    const date = new Date(event.startsAt).getTime();
    return date >= weekRange.start.getTime() && date < weekRange.end.getTime();
  });

  const internalCalendarEvents = buildInternalEvents(termEvents).filter((event) => {
    const date = new Date(event.startsAt).getTime();
    return date >= weekRange.start.getTime() && date < weekRange.end.getTime();
  });

  const scheduleEvents = [...calendarWeekEvents, ...internalCalendarEvents];

  const upcomingEvents = attachSubjectHint(
    [...calendarRange, ...buildInternalEvents(upcomingInternal)],
    subjects.map((subject) => ({ name: subject.name, code: subject.code }))
  );

  const subjectOptions = Array.from(
    new Set(enrollments.map((enrollment) => enrollment.subject.name))
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="animate-fade-in" style={{ animationDelay: "40ms" }}>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">
                Vista principal
              </p>
              <h2 className="text-lg font-semibold">Dashboard del cuatrimestre</h2>
            </div>
            <div className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted">
              {currentTerm?.label ?? "Sin cuatrimestre activo"}
            </div>
          </CardHeader>
          <CardBody>
            <WeeklySchedule events={scheduleEvents} />
          </CardBody>
        </Card>
        <Card className="animate-fade-in" style={{ animationDelay: "120ms" }}>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Gestión</p>
              <h2 className="text-lg font-semibold">Cuatrimestre y materias</h2>
            </div>
          </CardHeader>
          <CardBody>
            <TermManager
              currentTerm={currentTerm}
              terms={terms}
              subjects={subjects}
              isAdmin={isAdmin}
            />
          </CardBody>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Materias activas</p>
              <h2 className="text-lg font-semibold">Seguimiento y notas</h2>
            </div>
          </CardHeader>
          <CardBody>
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted">
                Activá materias para el cuatrimestre actual.
              </p>
            ) : (
              <ActiveSubjects initialEnrollments={enrollments} isAdmin={isAdmin} />
            )}
          </CardBody>
        </Card>
        <Card className="animate-fade-in" style={{ animationDelay: "280ms" }}>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Próximos 14 días</p>
              <h2 className="text-lg font-semibold">Eventos y entregas</h2>
            </div>
          </CardHeader>
          <CardBody>
            <UpcomingEvents events={upcomingEvents} subjectOptions={subjectOptions} />
          </CardBody>
        </Card>
      </div>
      <Card className="animate-fade-in" style={{ animationDelay: "360ms" }}>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Historial</p>
            <h2 className="text-lg font-semibold">Evaluaciones y entregas</h2>
          </div>
        </CardHeader>
        <CardBody>
          <EventManager
            enrollments={enrollments}
            initialEvents={allEvents}
            isAdmin={isAdmin}
          />
        </CardBody>
      </Card>
    </div>
  );
}
