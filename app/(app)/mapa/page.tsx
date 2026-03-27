import MapView from "@/components/map/map-view";
import { getLatestEnrollmentStatus, getPrerequisites, getSubjects } from "@/lib/queries";
import SummaryProgressBar from "@/components/dashboard/summary-progress-bar";
import { buildProgressSnapshot, OFFICIAL_TOTAL_CREDITS } from "@/lib/progress";
import { buildMapGraph } from "@/lib/map/map-graph";

export default async function MapaPage() {
  const [subjects, prerequisites, statusMap] = await Promise.all([
    getSubjects(),
    getPrerequisites(),
    getLatestEnrollmentStatus()
  ]);
  const progress = buildProgressSnapshot(subjects, statusMap);
  const { nodes, edges } = buildMapGraph({
    prerequisites,
    statusMap,
    subjects
  });

  return (
    <>
      <MapView nodes={nodes} edges={edges} />
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] z-40 hidden px-4 lg:block">
        <div className="mx-auto w-full max-w-[1320px] pl-[12.75rem] pr-[4.75rem]">
          <div className="pointer-events-auto w-full">
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
              mode="map-bottom"
            />
          </div>
        </div>
      </div>
    </>
  );
}
