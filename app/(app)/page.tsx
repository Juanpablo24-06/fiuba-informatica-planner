import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import ActiveSubjects from "@/components/dashboard/active-subjects";
import CalendarSync from "@/components/dashboard/calendar-sync";
import EventManager from "@/components/dashboard/event-manager";
import KpiOverview from "@/components/dashboard/kpi-overview";
import TermManager from "@/components/dashboard/term-manager";
import UpcomingEvents from "@/components/dashboard/upcoming-events";
import WeeklyFocus from "@/components/dashboard/weekly-focus";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getCalendarEventEnrichments } from "@/lib/ai/queries";
import { getSession } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google-calendar";
import {
  getAllEvents,
  getCurrentTerm,
  getEnrollmentsForTerm,
  getEventsForTerm,
  getSubjects,
  getTerms,
  getUpcomingEvents
} from "@/lib/queries";
import { formatDate, getWeekRange } from "@/lib/date";
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
    [...calendarRange, ...buildInternalEvents(upcomingInternal)],
    subjects.map((subject) => ({ name: subject.name, code: subject.code }))
  );

  const subjectOptions = Array.from(
    new Set(
      [...upcomingEvents, ...enrichedScheduleEvents]
        .map((event) => event.subject)
        .filter(Boolean)
    )
  ) as string[];

  const grades = termEvents.map((event) => event.grade).filter((grade) => grade !== null);
  const average = grades.length
    ? (grades.reduce((sum, value) => sum + (value ?? 0), 0) / grades.length).toFixed(1)
    : "--";
  const totalCredits = enrollments.reduce(
    (sum, enrollment) => sum + (enrollment.subject.credits ?? 0),
    0
  );
  const approved = enrollments.filter((enrollment) => enrollment.status === "aprobado").length;
  const efficiency = enrollments.length
    ? `${Math.round((approved / enrollments.length) * 100)}%`
    : "--";
  const finals = termEvents.filter((event) => event.type === "final").length;
  const gradeItems = termEvents
    .filter((event) => event.grade !== null)
    .map((event) => ({
      id: event.id,
      title: event.title ?? event.type,
      subject: event.enrollment?.subject?.name ?? null,
      date: formatDate(event.starts_at),
      grade: event.grade
    }));
  const creditItems = enrollments.map((enrollment) => ({
    id: enrollment.id,
    name: enrollment.subject.name,
    credits: enrollment.subject.credits ?? 0
  }));
  const efficiencyItems = enrollments.map((enrollment) => ({
    id: enrollment.id,
    name: enrollment.subject.name,
    status: enrollment.status
  }));
  const finalItems = termEvents
    .filter((event) => event.type === "final")
    .map((event) => ({
      id: event.id,
      title: event.title ?? event.type,
      subject: event.enrollment?.subject?.name ?? null,
      date: formatDate(event.starts_at),
      grade: event.grade
    }));

  const achievements = allEvents
    .filter((event) => event.grade !== null)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <KpiOverview
        average={average}
        grades={gradeItems}
        creditsTotal={totalCredits}
        credits={creditItems}
        efficiency={efficiency}
        efficiencyItems={efficiencyItems}
        finalsTotal={finals}
        finals={finalItems}
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <Card className="animate-fade-in" style={{ animationDelay: "120ms" }}>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Rendimiento</p>
              <h2 className="text-lg font-semibold">Materias activas</h2>
            </div>
          </CardHeader>
          <CardBody>
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted">
                Activá materias para el cuatrimestre actual.
              </p>
            ) : (
              <ActiveSubjects
                initialEnrollments={enrollments}
                events={termEvents}
                isAdmin={isAdmin}
              />
            )}
          </CardBody>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: "180ms" }}>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Admin & Logros</p>
              <h2 className="text-lg font-semibold">Operaciones clave</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            {isAdmin ? (
              <div className="space-y-3 rounded-3xl border border-white/[0.12] bg-surface/80 p-4 text-sm text-muted">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Integraciones</p>
                <CalendarSync />
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-text"
                >
                  Ir al panel admin
                  <ArrowUpRight className="h-4 w-4" strokeWidth={1.6} />
                </Link>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/[0.12] bg-surface/80 p-4 text-xs text-muted">
                Modo lectura activo. Solo admins pueden modificar datos.
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Hitos</p>
              {achievements.length === 0 ? (
                <p className="text-sm text-muted">Sin logros registrados todavía.</p>
              ) : (
                achievements.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-3xl border border-white/[0.12] bg-surface/80 px-3 py-3 text-sm"
                  >
                    <p className="font-semibold text-text">
                      {event.title ?? event.type}
                    </p>
                    <p className="text-xs text-muted">
                      {event.enrollment?.subject?.name ?? "Sin materia"} · {formatDate(event.starts_at)}
                      {event.grade !== null ? ` · Nota ${event.grade}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="animate-fade-in" style={{ animationDelay: "240ms" }}>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Semana actual</p>
              <h2 className="text-lg font-semibold">Radar semanal</h2>
            </div>
          </CardHeader>
          <CardBody>
            <WeeklyFocus events={enrichedScheduleEvents} />
          </CardBody>
        </Card>
        <Card className="animate-fade-in" style={{ animationDelay: "300ms" }}>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Esta semana</p>
              <h2 className="text-lg font-semibold">Exámenes y entregas</h2>
            </div>
          </CardHeader>
          <CardBody>
            <UpcomingEvents events={enrichedScheduleEvents} subjectOptions={subjectOptions} />
          </CardBody>
        </Card>
      </div>

      <Card className="animate-fade-in" style={{ animationDelay: "360ms" }}>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Gestión</p>
            <h2 className="text-lg font-semibold">Cuatrimestres y materias</h2>
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

      <Card className="animate-fade-in" style={{ animationDelay: "420ms" }}>
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
