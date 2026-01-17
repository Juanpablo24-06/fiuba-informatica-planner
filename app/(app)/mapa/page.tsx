import MapLegend from "@/components/map/map-legend";
import MapView from "@/components/map/map-view";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getLatestEnrollmentStatus, getPrerequisites, getSubjects } from "@/lib/queries";

export default async function MapaPage() {
  const subjects = await getSubjects();
  const prerequisites = await getPrerequisites();
  const statusMap = await getLatestEnrollmentStatus();

  const nodes = subjects.map((subject) => {
    const status = statusMap.get(subject.id);
    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      term: subject.term_suggested,
      type: subject.type,
      status: status?.status ?? null,
      color: status?.color ?? null,
      requirements: subject.requirements,
      credits: subject.credits,
      weekly_hours: subject.weekly_hours,
      total_hours: subject.total_hours,
      template: subject.template
    };
  });

  const edges = prerequisites.map((edge) => ({
    from: edge.prerequisite_id,
    to: edge.subject_id
  }));

  return (
    <div className="space-y-6">
      <Card className="animate-fade-in" style={{ animationDelay: "40ms" }}>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Mapa del plan</p>
            <h2 className="text-lg font-semibold">Correlativas y estados</h2>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-muted">
            Vista inspirada en FIUBA-Map, adaptada para estados de cursada y
            seguimiento privado.
          </p>
          <div className="mt-4">
            <MapLegend />
          </div>
        </CardBody>
      </Card>
      <Card className="animate-fade-in" style={{ animationDelay: "120ms" }}>
        <CardBody>
          <MapView nodes={nodes} edges={edges} />
        </CardBody>
      </Card>
    </div>
  );
}
