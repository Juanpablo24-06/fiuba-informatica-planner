import { CalendarClock, FolderKanban, GraduationCap, Layers3, PencilRuler } from "lucide-react";
import CalendarSync from "@/components/dashboard/calendar-sync";
import CourseWorkspaceDrawer from "@/components/dashboard/course-workspace-drawer";
import SubjectManager from "@/components/dashboard/subject-manager";
import TermManager from "@/components/dashboard/term-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getCurrentTerm, getEnrollmentsForTerm, getEventsForTerm, getSubjects, getTerms } from "@/lib/queries";

const statusLabel: Record<string, string> = {
  cursando: "Cursando",
  final_pendiente: "Final pendiente",
  aprobado: "Aprobado",
  recursar: "Recursar"
};

export default async function AdminPage() {
  const currentTerm = await getCurrentTerm();
  const terms = await getTerms();
  const subjects = await getSubjects();
  const enrollments = currentTerm ? await getEnrollmentsForTerm(currentTerm.id) : [];
  const termEvents = currentTerm ? await getEventsForTerm(currentTerm.id) : [];

  const approved = enrollments.filter((item) => item.status === "aprobado").length;
  const inProgress = enrollments.filter((item) => item.status === "cursando").length;

  const eventsByEnrollment = new Map<string, typeof termEvents>();
  for (const event of termEvents) {
    const list = eventsByEnrollment.get(event.enrollment_id) ?? [];
    list.push(event);
    eventsByEnrollment.set(event.enrollment_id, list);
  }

  return (
    <div className="space-y-6">
      <section className="panel px-8 py-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Panel Admin</p>
            <h1 className="mt-1 text-3xl font-semibold text-text">Centro de control académico</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Gestioná cuatrimestres, materias y eventos desde un flujo claro. Todo lo de edición vive acá para mantener el resumen limpio.
            </p>
          </div>
          <Badge className="border-accent/40 bg-accent/12 text-accent">
            Cuatrimestre actual: {currentTerm?.label ?? "Sin definir"}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/75 bg-surface-2 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Cuatrimestres</p>
            <div className="mt-2 flex items-center gap-2 text-text">
              <Layers3 className="h-4 w-4 text-accent" />
              <span className="text-2xl font-semibold">{terms.length}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border/75 bg-surface-2 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Materias base</p>
            <div className="mt-2 flex items-center gap-2 text-text">
              <FolderKanban className="h-4 w-4 text-accent" />
              <span className="text-2xl font-semibold">{subjects.length}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border/75 bg-surface-2 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Cursadas activas</p>
            <div className="mt-2 flex items-center gap-2 text-text">
              <GraduationCap className="h-4 w-4 text-accent" />
              <span className="text-2xl font-semibold">{enrollments.length}</span>
            </div>
            <p className="mt-1 text-xs text-muted">En curso: {inProgress}</p>
          </div>
          <div className="rounded-2xl border border-border/75 bg-surface-2 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Eventos internos</p>
            <div className="mt-2 flex items-center gap-2 text-text">
              <CalendarClock className="h-4 w-4 text-accent" />
              <span className="text-2xl font-semibold">{termEvents.length}</span>
            </div>
            <p className="mt-1 text-xs text-muted">Aprobadas: {approved}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Cuatrimestres</p>
              <h2 className="text-xl font-semibold">Asistente guiado y configuración actual</h2>
            </div>
          </CardHeader>
          <CardBody>
            <TermManager currentTerm={currentTerm} terms={terms} subjects={subjects} isAdmin />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Edición por materia</p>
              <h2 className="text-xl font-semibold">Abrí una ficha y editá todo sin salir del flujo</h2>
            </div>
          </CardHeader>
          <CardBody>
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted">No hay materias activas para editar en este cuatrimestre.</p>
            ) : (
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {enrollments.map((enrollment) => (
                  <CourseWorkspaceDrawer
                    key={enrollment.id}
                    enrollment={enrollment}
                    events={eventsByEnrollment.get(enrollment.id) ?? []}
                    isAdmin
                    trigger={
                      <button
                        type="button"
                        className="w-full rounded-2xl border border-border/75 bg-surface-2 px-4 py-3 text-left transition hover:border-accent/45"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-[11px] text-muted">{enrollment.subject.code ?? "SIN-COD"}</p>
                            <p className="mt-1 text-base font-semibold text-text">{enrollment.subject.name}</p>
                            <p className="mt-1 text-xs text-muted">
                              Estado: {statusLabel[enrollment.status] ?? enrollment.status}
                            </p>
                          </div>
                          <PencilRuler className="h-4 w-4 text-muted" />
                        </div>
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Catálogo de materias</p>
            <h2 className="text-xl font-semibold">Base de materias y ajustes estructurales</h2>
          </div>
        </CardHeader>
        <CardBody>
          <SubjectManager initialSubjects={subjects} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Integraciones</p>
            <h2 className="text-xl font-semibold">Sincronización de Google Calendar</h2>
          </div>
        </CardHeader>
        <CardBody>
          <CalendarSync />
        </CardBody>
      </Card>
    </div>
  );
}
