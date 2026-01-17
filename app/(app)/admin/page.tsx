import CalendarSync from "@/components/dashboard/calendar-sync";
import SubjectManager from "@/components/dashboard/subject-manager";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getSubjects } from "@/lib/queries";

export default async function AdminPage() {
  const subjects = await getSubjects();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Admin</p>
            <h2 className="text-lg font-semibold">Integraciones y mantenimiento</h2>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-muted">
            Este panel permite forzar actualizaciones y revisar configuraciones que
            impactan todo el sistema.
          </p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Google Calendar</p>
            <h2 className="text-lg font-semibold">Sincronización</h2>
          </div>
        </CardHeader>
        <CardBody>
          <CalendarSync />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Materias</p>
            <h2 className="text-lg font-semibold">Alta y edición rápida</h2>
          </div>
        </CardHeader>
        <CardBody>
          <SubjectManager initialSubjects={subjects} />
        </CardBody>
      </Card>
    </div>
  );
}
