import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import CourseWorkspaceDrawer from "@/components/dashboard/course-workspace-drawer";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/date";
import { getCalendarEvents } from "@/lib/google-calendar";
import { getCurrentTerm, getEnrollmentsForTerm, getEventsForTerm, getSubjects } from "@/lib/queries";
import type { CalendarEvent, Event } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_LABELS: Record<string, string> = {
  cursando: "Cursando",
  final_pendiente: "Final pendiente",
  aprobado: "Aprobado",
  recursar: "Recursar"
};

const STATUS_TONE: Record<string, string> = {
  cursando: "bg-accent/10 text-accent border-accent/40",
  final_pendiente: "bg-warning/10 text-warning border-warning/40",
  aprobado: "bg-success/10 text-success border-success/40",
  recursar: "bg-danger/10 text-danger border-danger/40"
};

const PHRASES_EDITORIALES = [
  "Una materia a la vez, una carrera completa.",
  "Lo importante no es correr: es sostener el ritmo.",
  "Cada semana ordenada te acerca al título.",
  "Menos ruido, más foco en lo que sí suma.",
  "Tu progreso también se construye en días tranquilos."
];

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

const calcLoad = (events: CalendarEvent[]) => {
  const now = Date.now();
  const nextWeek = now + 7 * DAY_MS;
  const weekEvents = events.filter((event) => {
    const time = new Date(event.startsAt).getTime();
    return time >= now && time <= nextWeek;
  });
  const exams = weekEvents.filter((event) =>
    ["parcial", "final", "exam"].includes((event.type ?? "").toLowerCase())
  ).length;

  if (weekEvents.length >= 10 || exams >= 2) {
    return {
      label: "Alta",
      mood: "Modo parciales activado",
      level: "alta" as const,
      weekEvents: weekEvents.length,
      exams
    };
  }
  if (weekEvents.length >= 6 || exams >= 1) {
    return {
      label: "Media",
      mood: "Semana intensa, pero manejable",
      level: "media" as const,
      weekEvents: weekEvents.length,
      exams
    };
  }
  return {
    label: "Baja",
    mood: "Todo bajo control",
    level: "baja" as const,
    weekEvents: weekEvents.length,
    exams
  };
};

export default async function DashboardPage() {
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  const currentTerm = await getCurrentTerm();
  const subjects = await getSubjects();
  const enrollments = currentTerm ? await getEnrollmentsForTerm(currentTerm.id) : [];
  const termEvents = currentTerm ? await getEventsForTerm(currentTerm.id) : [];

  const now = new Date();
  const calendarEvents = await getCalendarEvents(
    now.toISOString(),
    new Date(now.getTime() + 10 * DAY_MS).toISOString()
  );

  const mergedEvents = [...calendarEvents, ...buildInternalEvents(termEvents)].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  const approved = enrollments.filter((item) => item.status === "aprobado").length;
  const progressPct = subjects.length ? Math.round((approved / subjects.length) * 100) : 0;
  const nextEvents = mergedEvents.slice(0, 6);
  const load = calcLoad(mergedEvents);

  const suggestedTerms = subjects
    .map((subject) => subject.term_suggested)
    .filter((term): term is number => Boolean(term));
  const maxPlanTerm = Math.max(10, suggestedTerms.length ? Math.max(...suggestedTerms) : 10);
  const currentPlanTerm = Math.max(
    1,
    Math.min(
      maxPlanTerm,
      enrollments.length
        ? Math.round(
            enrollments.reduce((sum, item) => sum + (item.subject.term_suggested ?? 1), 0) /
              enrollments.length
          )
        : Math.round((progressPct / 100) * maxPlanTerm)
    )
  );
  const totalYears = Math.max(5, Math.ceil(maxPlanTerm / 2));
  const currentYear = Math.max(1, Math.min(totalYears, Math.ceil(currentPlanTerm / 2)));
  const careerProgressPct = Math.max(4, Math.round((currentPlanTerm / maxPlanTerm) * 100));

  const phraseSeed = Math.floor(now.getTime() / DAY_MS) + approved + enrollments.length;
  const editorialPhrase = PHRASES_EDITORIALES[Math.abs(phraseSeed) % PHRASES_EDITORIALES.length];

  const eventsByEnrollment = new Map<string, Event[]>();
  for (const event of termEvents) {
    const list = eventsByEnrollment.get(event.enrollment_id) ?? [];
    list.push(event);
    eventsByEnrollment.set(event.enrollment_id, list);
  }

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-6 pb-8">
      <div className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
        <section className="space-y-6">
          <section className="panel px-8 py-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Ruta académica</p>
                <h1 className="mt-1 text-4xl font-semibold text-text">Plan Ing Informática</h1>
              </div>
              <Badge className="border-accent/40 bg-accent/10 text-accent">
                Cuatrimestre actual: {currentTerm?.label ?? "Sin definir"}
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="rounded-full border border-border/60 bg-surface-2/60 px-3 py-1">
                {approved} de {subjects.length} materias aprobadas
              </span>
              <span className="rounded-full border border-border/60 bg-surface-2/60 px-3 py-1">
                Año estimado: {currentYear}
              </span>
            </div>

            <div className="mt-6">
              <div className="relative h-2 rounded-full bg-border/40">
                <div className="absolute left-0 top-0 h-full rounded-full bg-accent" style={{ width: `${careerProgressPct}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {Array.from({ length: totalYears }).map((_, index) => {
                  const year = index + 1;
                  const isCurrent = year === currentYear;
                  const isPast = year < currentYear;
                  return (
                    <div key={year} className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isCurrent ? "bg-accent" : isPast ? "bg-success/70" : "bg-border/70"
                        }`}
                      />
                      <p className={`text-xs ${isCurrent ? "font-semibold text-text" : "text-muted"}`}>
                        Año {year}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="panel px-8 py-7">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Materias activas</p>
                <h2 className="mt-1 text-3xl font-semibold text-text">Tu cuatrimestre en foco</h2>
              </div>
              <Link href="/mapa" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                Ir al mapa <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {enrollments.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-surface-2/50 px-4 py-6 text-sm text-muted">
                No hay materias activas para este cuatrimestre.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {enrollments.map((enrollment) => {
                  const nextEvent = (eventsByEnrollment.get(enrollment.id) ?? []).sort(
                    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
                  )[0];

                  return (
                    <CourseWorkspaceDrawer
                      key={enrollment.id}
                      enrollment={enrollment}
                      events={eventsByEnrollment.get(enrollment.id) ?? []}
                      isAdmin={isAdmin}
                      trigger={
                        <button
                          type="button"
                          className="group rounded-[1.15rem] border border-border/60 bg-surface-2/45 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-accent/35"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-xs text-muted">{enrollment.subject.code ?? "SIN-COD"}</p>
                              <p className="mt-1 text-lg font-semibold leading-tight text-text group-hover:text-accent">
                                {enrollment.subject.name}
                              </p>
                            </div>
                            <span
                              className="mt-1 h-3 w-3 rounded-full border border-border/50"
                              style={{ backgroundColor: enrollment.color ?? "rgb(var(--color-accent))" }}
                            />
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <Badge className={STATUS_TONE[enrollment.status] ?? "border-border/60 bg-surface text-muted"}>
                              {STATUS_LABELS[enrollment.status] ?? enrollment.status}
                            </Badge>
                            {enrollment.subject.credits ? (
                              <span className="rounded-full border border-border/60 bg-surface px-2 py-0.5 text-muted">
                                {enrollment.subject.credits} créditos
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-3 text-xs text-muted">
                            {nextEvent ? `Próximo evento: ${formatDateTime(nextEvent.starts_at)}` : "Sin eventos cargados"}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-accent">Abrir ficha completa</p>
                        </button>
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        </section>

        <aside className="space-y-4">
          <section className="panel p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-3xl font-semibold leading-none text-text">Ahora</h3>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/12 text-accent">
                <Clock3 className="h-4 w-4" />
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.26em] text-muted">
              {now.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" })}
            </p>

            <div className="mt-5 space-y-4">
              {nextEvents.length === 0 ? (
                <p className="text-sm text-muted">No hay actividades próximas.</p>
              ) : (
                nextEvents.map((event) => (
                  <div key={event.id} className="relative border-l border-border/60 pl-4">
                    <span
                      className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: event.color ?? "rgb(var(--color-accent))" }}
                    />
                    <p className="font-mono text-xs text-muted">
                      {new Date(event.startsAt).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                    <p className="text-base font-semibold text-text">{event.title}</p>
                    <p className="text-sm text-muted">{event.subject ?? "Evento general"}</p>
                  </div>
                ))
              )}
            </div>

            <Link
              href="/horario"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-border/65 bg-surface-2/55 px-4 py-3 text-sm font-semibold text-text"
            >
              Ver agenda completa
            </Link>
          </section>

          <section className="panel p-6">
            <p className="text-xs uppercase tracking-[0.26em] text-muted">Semáforo de carga</p>
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full transition ${load.level === "baja" ? "scale-125 bg-success shadow-soft" : "bg-success/40"}`}
              />
              <span
                className={`h-3 w-3 rounded-full transition ${load.level === "media" ? "scale-125 bg-warning shadow-soft" : "bg-warning/40"}`}
              />
              <span
                className={`h-3 w-3 rounded-full transition ${load.level === "alta" ? "scale-125 bg-danger shadow-soft" : "bg-danger/40"}`}
              />
            </div>
            <p className="mt-3 text-4xl font-semibold text-text">{load.label}</p>
            <p className="text-sm text-muted">{load.mood}</p>
            <p className="mt-1 text-xs text-muted">
              {load.weekEvents} eventos próximos · {load.exams} evaluaciones exigentes
            </p>
          </section>

          <section className="panel p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Frase del día</p>
            <p className="mt-3 text-xl leading-relaxed text-text font-display">&ldquo;{editorialPhrase}&rdquo;</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
