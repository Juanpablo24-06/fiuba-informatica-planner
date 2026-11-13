import MapViewStage from "@/components/map/map-view-stage";
import { getLatestEnrollmentStatus, getPrerequisites, getSubjects } from "@/lib/queries";
import { buildMapGraph } from "@/lib/map/map-graph";

export default async function MapaPage() {
  const [subjects, prerequisites, statusMap] = await Promise.all([
    getSubjects(),
    getPrerequisites(),
    getLatestEnrollmentStatus()
  ]);
  const { nodes, edges } = buildMapGraph({
    prerequisites,
    statusMap,
    subjects
  });

  return (
    <div
      data-map-root="true"
      className="fixed inset-0 overflow-hidden"
    >
      <MapViewStage nodes={nodes} edges={edges} />
    </div>
  );
}
