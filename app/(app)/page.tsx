import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import CourseWorkspaceDrawer from "@/components/dashboard/course-workspace-drawer";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/date";
import { getCalendarEvents } from "@/lib/google-calendar";
import { getCurrentTerm, getEnrollmentsForTerm, getEventsForTerm, getLatestEnrollmentStatus, getSubjects } from "@/lib/queries";
import { formatSchedulePreview } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { CalendarEvent, Event } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_LABELS: Record<string, string> = {
  cursando: "Cursando",
  final_pendiente: "Final pendiente",
  aprobado: "Aprobado",
  recursar: "Recursar"
};

const STATUS_PILL_TONE: Record<string, string> = {
  cursando: "bg-accent/10 text-accent",
  final_pendiente: "bg-warning/10 text-warning",
  aprobado: "bg-success/10 text-success",
  recursar: "bg-danger/10 text-danger"
};

const OFFICIAL_CBC_CREDITS = 38;
const OFFICIAL_SECOND_CYCLE_CREDITS = 188;
const OFFICIAL_REQUIRED_CREDITS = 202;
const OFFICIAL_ELECTIVE_CREDITS = 24;
const OFFICIAL_TOTAL_CREDITS = 226;
const GENERIC_ELECTIVE_NAMES = new Set(["Electivas/Optativas I", "Electivas/Optativas II"]);

const PHRASES_EDITORIALES = [
  "Una materia a la vez, una carrera completa.",
  "Lo importante no es correr: es sostener el ritmo.",
  "Cada semana ordenada te acerca al título.",
  "Menos ruido, más foco en lo que sí suma.",
  "Tu progreso también se construye en días tranquilos."
];

const isCbcSubject = (subject: {
  type?: string | null;
  cycle?: string | null;
}) => {
  const type = subject.type?.toLowerCase();
  const cycle = subject.cycle?.toLowerCase();
  return type === "cbc" || cycle === "cbc";
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

const splitSchedulePreview = (preview: string) => {
  const match = preview.match(/^(.*?)(\d{2}:\d{2}-\d{2}:\d{2}.*)$/);
  if (!match) {
    return { days: preview.trim(), time: null as string | null };
  }

  return {
    days: match[1].trim(),
    time: match[2].trim()
  };
};

const getSubjectCredits = (subject: {
  credits?: number | null;
  weekly_hours?: number | null;
}) => subject.credits ?? subject.weekly_hours ?? 0;

const isGenericElectiveSubject = (subject: { name: string }) =>
  GENERIC_ELECTIVE_NAMES.has(subject.name);

const isFinalProjectStage = (subject: { name: string }) =>
  /Trabajo Integrador Final|Tesis\/Trabajo Profesional/i.test(subject.name);

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
  const now = new Date();
  const [session, currentTerm, subjects, latestStatusMap, calendarEvents] = await Promise.all([
    getSession(),
    getCurrentTerm(),
    getSubjects(),
    getLatestEnrollmentStatus(),
    getCalendarEvents(
      now.toISOString(),
      new Date(now.getTime() + 10 * DAY_MS).toISOString()
    )
  ]);
  const isAdmin = session?.role === "admin";

  const [enrollments, termEvents] = currentTerm
    ? await Promise.all([
        getEnrollmentsForTerm(currentTerm.id),
        getEventsForTerm(currentTerm.id)
      ])
    : [[], []];

  const mergedEvents = [...calendarEvents, ...buildInternalEvents(termEvents)].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  const requiredSubjects = subjects.filter(
    (subject) => (subject.type ?? "").toLowerCase() !== "electiva"
  );
  const nonFinalRequiredSubjects = requiredSubjects.filter((subject) => !isFinalProjectStage(subject));
  const finalProjectStages = requiredSubjects.filter((subject) => isFinalProjectStage(subject));
  const totalRequiredCourses =
    nonFinalRequiredSubjects.length + (finalProjectStages.length > 0 ? 1 : 0);
  const approvedRequiredCount =
    nonFinalRequiredSubjects.filter((subject) => latestStatusMap.get(subject.id)?.status === "aprobado").length +
    (finalProjectStages.length > 0 &&
    finalProjectStages.every((subject) => latestStatusMap.get(subject.id)?.status === "aprobado")
      ? 1
      : 0);
  const nextEvents = mergedEvents.slice(0, 4);
  const load = calcLoad(mergedEvents);

  const cbcSubjects = requiredSubjects.filter((subject) => isCbcSubject(subject));
  const approvedCbcCredits = cbcSubjects
    .filter((subject) => latestStatusMap.get(subject.id)?.status === "aprobado")
    .reduce((sum, subject) => sum + getSubjectCredits(subject), 0);
  const cbcPct = Math.round((approvedCbcCredits / OFFICIAL_CBC_CREDITS) * 100);

  const secondCycleRequiredSubjects = requiredSubjects.filter(
    (subject) => !isCbcSubject(subject)
  );
  const approvedRequiredCredits = requiredSubjects
    .filter((subject) => latestStatusMap.get(subject.id)?.status === "aprobado")
    .reduce((sum, subject) => sum + getSubjectCredits(subject), 0);
  const approvedSecondCycleRequiredCredits = secondCycleRequiredSubjects
    .filter((subject) => latestStatusMap.get(subject.id)?.status === "aprobado")
    .reduce((sum, subject) => sum + getSubjectCredits(subject), 0);
  const electives = subjects.filter(
    (subject) =>
      (subject.type ?? "").toLowerCase() === "electiva" && !isGenericElectiveSubject(subject)
  );
  const approvedElectiveCredits = Math.min(
    OFFICIAL_ELECTIVE_CREDITS,
    electives
      .filter((subject) => latestStatusMap.get(subject.id)?.status === "aprobado")
      .reduce((sum, subject) => sum + getSubjectCredits(subject), 0)
  );
  const approvedSecondCycleCredits = Math.min(
    OFFICIAL_SECOND_CYCLE_CREDITS,
    approvedSecondCycleRequiredCredits + approvedElectiveCredits
  );
  const progressPct = Math.round(
    ((approvedRequiredCredits + approvedElectiveCredits) / OFFICIAL_TOTAL_CREDITS) * 100
  );
  const cbcWeightPct = Math.round((OFFICIAL_CBC_CREDITS / OFFICIAL_TOTAL_CREDITS) * 100);
  const cbcFillPct = Math.round((cbcWeightPct * cbcPct) / 100);
  const professionalWeightPct = Math.max(0, 100 - cbcWeightPct);
  const secondCyclePct = Math.round(
    (approvedSecondCycleCredits / OFFICIAL_SECOND_CYCLE_CREDITS) * 100
  );
  const professionalFillPct = Math.round((professionalWeightPct * secondCyclePct) / 100);
  const careerProgressPct = progressPct;
  const phraseSeed =
    Math.floor(now.getTime() / DAY_MS) + approvedRequiredCredits + approvedElectiveCredits;
  const editorialPhrase = PHRASES_EDITORIALES[Math.abs(phraseSeed) % PHRASES_EDITORIALES.length];

  const eventsByEnrollment = new Map<string, Event[]>();
  for (const event of termEvents) {
    const list = eventsByEnrollment.get(event.enrollment_id) ?? [];
    list.push(event);
    eventsByEnrollment.set(event.enrollment_id, list);
  }

  const nextEventByEnrollment = new Map<string, Event | undefined>();
  for (const [enrollmentId, events] of eventsByEnrollment.entries()) {
    nextEventByEnrollment.set(
      enrollmentId,
      [...events].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      )[0]
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-6 pb-8">
      <div className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
        <section className="space-y-12">
          <section className="px-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Ruta académica</p>
                <h1 className="mt-1 text-4xl font-semibold text-text">Resumen Académico</h1>
              </div>
              <Badge className="border-accent/40 bg-accent/10 text-accent">
                {currentTerm?.label ?? "Sin cuatrimestre"}
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="rounded-full border border-border/60 bg-surface-2/60 px-3 py-1">
                Obligatorias {approvedRequiredCount}/{totalRequiredCourses} cursos
              </span>
              {electives.length ? (
                <span className="rounded-full border border-border/60 bg-surface-2/60 px-3 py-1">
                  Electivas {approvedElectiveCredits}/{OFFICIAL_ELECTIVE_CREDITS}
                </span>
              ) : null}
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-muted">
                <span>Avance de la carrera</span>
                <span className="font-semibold text-accent">{careerProgressPct}% completo</span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-border/35">
                {cbcWeightPct > 0 ? (
                  <div
                    className="absolute inset-y-0 left-0 bg-warning/20"
                    style={{ width: `${cbcWeightPct}%` }}
                  />
                ) : null}
                {cbcFillPct > 0 ? (
                  <div
                    className="absolute inset-y-0 left-0 bg-warning"
                    style={{ width: `${cbcFillPct}%` }}
                  />
                ) : null}
                {professionalFillPct > 0 ? (
                  <div
                    className="absolute inset-y-0 bg-accent"
                    style={{
                      left: `${cbcWeightPct}%`,
                      width: `${Math.min(professionalFillPct, professionalWeightPct)}%`
                    }}
                  />
                ) : null}
                {cbcWeightPct > 0 ? (
                  <div
                    className="absolute inset-y-0 w-px bg-warning/70"
                    style={{ left: `${cbcWeightPct}%` }}
                  />
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                <span className="rounded-full border border-warning/45 bg-warning/10 px-2.5 py-1 text-warning">
                  Tramo CBC {cbcPct}%
                </span>
                <span className="rounded-full border border-accent/45 bg-accent/10 px-2.5 py-1 text-accent">
                  Segundo ciclo {secondCyclePct}%
                </span>
              </div>
            </div>
          </section>

          <section className="px-2">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Materias activas</p>
                <h2 className="mt-1 text-3xl font-semibold text-text">Cursada actual</h2>
              </div>
              <Link href="/mapa" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                Ver mapa <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {enrollments.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-surface-2/50 px-4 py-6 text-sm text-muted">
                No hay materias activas para este cuatrimestre.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {enrollments.map((enrollment) => {
                  const nextEvent = nextEventByEnrollment.get(enrollment.id);
                  const schedulePreview = enrollment.schedule.length
                    ? formatSchedulePreview(enrollment.schedule, { maxBlocks: 1 })
                    : "Horario por definir";
                  const scheduleParts = splitSchedulePreview(schedulePreview);

                  return (
                    <CourseWorkspaceDrawer
                      key={enrollment.id}
                      enrollment={enrollment}
                      events={eventsByEnrollment.get(enrollment.id) ?? []}
                      isAdmin={isAdmin}
                      trigger={
                        <button
                          type="button"
                          className="group relative overflow-hidden rounded-2xl border border-border/45 bg-surface/80 px-5 py-5 text-left shadow-sm backdrop-blur-[6px] transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: enrollment.color ?? "rgb(var(--color-accent))" }}
                              />
                              <p className="font-mono text-[13px] tracking-[0.16em] text-muted">
                                {enrollment.subject.code ?? "SIN-COD"}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "rounded-full px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
                                STATUS_PILL_TONE[enrollment.status] ?? "bg-surface-2 text-muted"
                              )}
                            >
                              {STATUS_LABELS[enrollment.status] ?? enrollment.status}
                            </span>
                          </div>

                          <div className="mt-5">
                            <p
                              className="font-display text-[1rem] font-medium leading-[1.06] tracking-[-0.015em] text-text/92 transition-colors duration-300 group-hover:text-accent sm:text-[1.08rem]"
                            >
                              {enrollment.subject.name}
                            </p>
                          </div>

                          <div className="mt-5 space-y-3">
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-[#8b776e]">
                                <CalendarDays className="h-[15px] w-[15px]" />
                              </span>
                              <div className="space-y-1">
                                <p className="text-[13px] leading-none text-muted">
                                  {scheduleParts.days}
                                </p>
                                {scheduleParts.time ? (
                                  <p className="text-[15px] font-medium leading-none text-[#7b6b62]">
                                    {scheduleParts.time}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-accent">
                                <Clock3 className="h-[15px] w-[15px]" />
                              </span>
                              <div className="space-y-1">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                                  Próximo
                                </p>
                                <p className="text-[15px] font-semibold leading-none text-text">
                                  {nextEvent ? formatDateTime(nextEvent.starts_at) : "Sin fechas cargadas"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        </section>

        <aside className="panel flex h-fit flex-col gap-8 bg-surface/80 p-8 backdrop-blur-[8px]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-3xl font-semibold leading-none text-text">Próximas fechas</h3>
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
                    {event.subject ? (
                      <p className="text-sm text-muted">{event.subject}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <Link
              href="/horario"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-border/65 bg-surface-2/45 px-4 py-3 text-sm font-semibold text-text backdrop-blur-[4px]"
            >
              Abrir agenda
            </Link>
          </section>

          <div className="h-px w-full bg-border/40" />

          <section>
            <p className="text-xs uppercase tracking-[0.26em] text-muted">Carga semanal</p>
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
              {load.weekEvents} actividades en los próximos 7 días · {load.exams} evaluaciones exigentes
            </p>
          </section>

          <div className="h-px w-full bg-border/40" />

          <section>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Frase del día</p>
            <p className="mt-3 text-xl leading-relaxed text-text font-display">&ldquo;{editorialPhrase}&rdquo;</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
