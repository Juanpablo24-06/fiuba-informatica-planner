import MapView from "@/components/map/map-view";
import { getLatestEnrollmentStatus, getPrerequisites, getSubjects } from "@/lib/queries";

const GENERIC_ELECTIVE_NAMES = new Set(["Electivas/Optativas I", "Electivas/Optativas II"]);

export default async function MapaPage() {
  const [subjects, prerequisites, statusMap] = await Promise.all([
    getSubjects(),
    getPrerequisites(),
    getLatestEnrollmentStatus()
  ]);

  const filteredSubjects = subjects.filter((subject) => !GENERIC_ELECTIVE_NAMES.has(subject.name));
  const visibleSubjectIds = new Set(filteredSubjects.map((subject) => subject.id));

  const nodes = filteredSubjects.map((subject) => {
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

  const edges = prerequisites
    .filter(
      (edge) => visibleSubjectIds.has(edge.prerequisite_id) && visibleSubjectIds.has(edge.subject_id)
    )
    .map((edge) => ({
      from: edge.prerequisite_id,
      to: edge.subject_id
    }));

  return <MapView nodes={nodes} edges={edges} />;
}
