import { CalendarDays, Clock3 } from "lucide-react";
import CourseWorkspaceDrawer from "@/components/dashboard/course-workspace-drawer";
import SummaryProgressBar from "@/components/dashboard/summary-progress-bar";
import SectionLink from "@/components/layout/section-link";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/date";
import { getCalendarEvents } from "@/lib/google-calendar";
import { getCurrentTerm, getEnrollmentsForTerm, getEventsForTerm, getLatestEnrollmentStatus, getSubjects } from "@/lib/queries";
import { buildProgressSnapshot, OFFICIAL_TOTAL_CREDITS } from "@/lib/progress";
import {
  DAY_MS,
  calcLoad,
  getEditorialPhrase,
  getNextFutureEventByEnrollment,
  getUpcomingMergedEvents,
  groupEventsByEnrollment,
  splitSchedulePreview
} from "@/lib/dashboard/summary-data";
import { formatSchedulePreview } from "@/lib/schedule";
import { cn } from "@/lib/utils";

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

  const upcomingEvents = getUpcomingMergedEvents({
    calendarEvents,
    internalEvents: termEvents,
    now
  });
  const nextEvents = upcomingEvents.slice(0, 4);
  const load = calcLoad(upcomingEvents, now);

  const progress = buildProgressSnapshot(subjects, latestStatusMap);
  const phraseSeed = Math.floor(now.getTime() / DAY_MS) + progress.approvedTotalCredits;
  const editorialPhrase = getEditorialPhrase(phraseSeed);
  const eventsByEnrollment = groupEventsByEnrollment(termEvents);
  const nextEventByEnrollment = getNextFutureEventByEnrollment(termEvents, now);

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-6 pb-8">
      <div className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
        <section className="space-y-12 px-2 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Ruta académica</p>
              <h1 className="mt-1 text-4xl font-semibold text-text">Resumen Académico</h1>
            </div>
          </div>

          <div className="mt-6">
            <SummaryProgressBar
              approvedTotalCredits={progress.approvedTotalCredits}
              totalCredits={OFFICIAL_TOTAL_CREDITS}
              progressPct={progress.progressPct}
              approvedCbcCredits={progress.approvedCbcCredits}
              totalCbcCredits={progress.totalCbcCredits}
              approvedCbcCourses={progress.approvedCbcCourses}
              totalCbcCourses={progress.totalCbcCourses}
              approvedObligatoryCredits={progress.approvedObligatoryCredits}
              totalObligatoryCredits={progress.totalObligatoryCredits}
              approvedObligatoryCourses={progress.approvedObligatoryCourses}
              totalObligatoryCourses={progress.totalObligatoryCourses}
              approvedElectiveCredits={progress.approvedElectiveCredits}
              totalElectiveCredits={progress.totalElectiveCredits}
              approvedTifCredits={progress.approvedTifCredits}
              totalTifCredits={progress.totalTifCredits}
              mode="summary"
            />
          </div>
        </section>

        <section className="px-2">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Materias activas</p>
                <h2 className="mt-1 text-3xl font-semibold text-text">Cursada actual</h2>
              </div>
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

            <SectionLink
              href="/horario"
              prefetch={false}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-border/65 bg-surface-2/45 px-4 py-3 text-sm font-semibold text-text backdrop-blur-[4px]"
            >
              Abrir agenda
            </SectionLink>
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
