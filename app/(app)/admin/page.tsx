import { CalendarClock, FolderKanban, GraduationCap, Layers3 } from "lucide-react";
import CalendarSync from "@/components/dashboard/calendar-sync";
import SubjectManager from "@/components/dashboard/subject-manager";
import TermManager from "@/components/dashboard/term-manager";
import TermReviewManager from "@/components/dashboard/term-review-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getCurrentTerm, getEnrollmentsForTerm, getEventsForTerm, getLatestEnrollmentStatus, getSubjects, getTerms } from "@/lib/queries";

export default async function AdminPage() {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const currentTerm = await getCurrentTerm();
  const terms = await getTerms();
  const subjects = await getSubjects();
  const latestStatusMap = await getLatestEnrollmentStatus();
  const currentEnrollments = currentTerm ? await getEnrollmentsForTerm(currentTerm.id) : [];
  const currentTermEvents = currentTerm ? await getEventsForTerm(currentTerm.id) : [];
  const completedSubjectIds = Array.from(latestStatusMap.entries())
    .filter(([, value]) => value.status === "aprobado")
    .map(([subjectId]) => subjectId);
  let reviewTerm = currentTerm ?? terms[0] ?? null;
  let reviewEnrollments =
    reviewTerm && reviewTerm.id === currentTerm?.id
      ? currentEnrollments
      : reviewTerm
        ? await getEnrollmentsForTerm(reviewTerm.id)
        : [];
  let reviewEvents =
    reviewTerm && reviewTerm.id === currentTerm?.id
      ? currentTermEvents
      : reviewTerm
        ? await getEventsForTerm(reviewTerm.id)
        : [];

  if (reviewEnrollments.length === 0) {
    for (const term of terms) {
      if (term.id === reviewTerm?.id) continue;
      const candidateEnrollments = await getEnrollmentsForTerm(term.id);
      if (candidateEnrollments.length === 0) continue;
      reviewTerm = term;
      reviewEnrollments = candidateEnrollments;
      reviewEvents = await getEventsForTerm(term.id);
      break;
    }
  }

  const approved = currentEnrollments.filter((item) => item.status === "aprobado").length;
  const inProgress = currentEnrollments.filter((item) => item.status === "cursando").length;

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
              <span className="text-2xl font-semibold">{currentEnrollments.length}</span>
            </div>
            <p className="mt-1 text-xs text-muted">En curso: {inProgress}</p>
          </div>
          <div className="rounded-2xl border border-border/75 bg-surface-2 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Eventos internos</p>
            <div className="mt-2 flex items-center gap-2 text-text">
              <CalendarClock className="h-4 w-4 text-accent" />
              <span className="text-2xl font-semibold">{currentTermEvents.length}</span>
            </div>
            <p className="mt-1 text-xs text-muted">Aprobadas: {approved}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[1.05fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Cuatrimestres</p>
              <h2 className="text-xl font-semibold">Asistente guiado y configuración actual</h2>
            </div>
          </CardHeader>
          <CardBody>
            <TermManager
              currentTerm={currentTerm}
              terms={terms}
              subjects={subjects}
              completedSubjectIds={completedSubjectIds}
              isAdmin
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Revisión post-creación</p>
              <h2 className="text-xl font-semibold">Ver, agregar, quitar y editar materias por cuatrimestre</h2>
            </div>
          </CardHeader>
          <CardBody>
            <TermReviewManager
              terms={terms}
              subjects={subjects}
              initialTermId={reviewTerm?.id ?? null}
              initialEnrollments={reviewEnrollments}
              initialEvents={reviewEvents}
              isAdmin
            />
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
