import MapView from "@/components/map/map-view";
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
      cycle: subject.cycle,
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

  return <MapView nodes={nodes} edges={edges} />;
}
