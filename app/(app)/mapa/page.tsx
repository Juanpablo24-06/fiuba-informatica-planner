import MapView, { type MapNode } from "@/components/map/map-view";
import { getLatestEnrollmentStatus, getPrerequisites, getSubjects } from "@/lib/queries";
import SummaryProgressBar from "@/components/dashboard/summary-progress-bar";
import { buildProgressSnapshot, OFFICIAL_TOTAL_CREDITS } from "@/lib/progress";

const GENERIC_ELECTIVE_NAMES = new Set(["Electivas/Optativas I", "Electivas/Optativas II"]);
const FINAL_PROJECT_NODE_ID = "__tif__";
const CBC_CLUSTER_NODE_ID = "__cbc__";

const isFinalProjectStage = (subject: { name: string }) =>
  /Trabajo Integrador Final|Tesis\/Trabajo Profesional/i.test(subject.name);

const isCbcSubject = (subject: { cycle?: string | null; type?: string | null }) =>
  subject.cycle?.toLowerCase() === "cbc" || subject.type?.toLowerCase() === "cbc";

const deriveFinalProjectStatus = (
  stages: Array<{ id: string }>,
  statusMap: Awaited<ReturnType<typeof getLatestEnrollmentStatus>>
) => {
  const stageStatuses = stages
    .map((stage) => statusMap.get(stage.id))
    .filter(Boolean);

  if (!stageStatuses.length) return null;
  if (stageStatuses.every((status) => status?.status === "aprobado")) return "aprobado";
  if (stageStatuses.some((status) => status?.status === "cursando")) return "cursando";
  if (stageStatuses.some((status) => status?.status === "final_pendiente")) return "final_pendiente";
  if (stageStatuses.some((status) => status?.status === "recursar")) return "recursar";
  return stageStatuses[0]?.status ?? null;
};

const deriveAggregateStatus = (
  subjects: Array<{ id: string }>,
  statusMap: Awaited<ReturnType<typeof getLatestEnrollmentStatus>>
) => {
  const statuses = subjects.map((subject) => statusMap.get(subject.id)).filter(Boolean);
  if (!statuses.length) return null;
  if (statuses.every((status) => status?.status === "aprobado")) return "aprobado";
  if (statuses.some((status) => status?.status === "cursando")) return "cursando";
  if (statuses.some((status) => status?.status === "final_pendiente")) return "final_pendiente";
  if (statuses.some((status) => status?.status === "recursar")) return "recursar";
  return statuses[0]?.status ?? null;
};

export default async function MapaPage() {
  const [subjects, prerequisites, statusMap] = await Promise.all([
    getSubjects(),
    getPrerequisites(),
    getLatestEnrollmentStatus()
  ]);
  const progress = buildProgressSnapshot(subjects, statusMap);

  const cbcSubjects = subjects
    .filter((subject) => isCbcSubject(subject))
    .sort((a, b) => (a.term_suggested ?? 0) - (b.term_suggested ?? 0) || a.name.localeCompare(b.name));
  const finalProjectStages = subjects
    .filter((subject) => isFinalProjectStage(subject))
    .sort((a, b) => (a.term_suggested ?? 0) - (b.term_suggested ?? 0));
  const regularSubjects = subjects.filter(
    (subject) =>
      !GENERIC_ELECTIVE_NAMES.has(subject.name) &&
      !isFinalProjectStage(subject)
  );
  const approvedCbcCredits = cbcSubjects.reduce(
    (sum, subject) =>
      sum + (statusMap.get(subject.id)?.status === "aprobado" ? subject.credits ?? subject.weekly_hours ?? 0 : 0),
    0
  );
  const cbcNode =
    cbcSubjects.length > 0
      ? {
          id: CBC_CLUSTER_NODE_ID,
          name: "Ciclo Básico Común",
          code: "CBC",
          term_suggested: 1,
          cycle: "cbc",
          type: "obligatoria",
          requirements: null,
          credits: 38,
          weekly_hours: cbcSubjects.reduce((sum, subject) => sum + (subject.weekly_hours ?? 0), 0),
          total_hours: cbcSubjects.reduce((sum, subject) => sum + (subject.total_hours ?? 0), 0),
          template: {
            notas: "Nodo agrupado del CBC. Podés expandirlo o compactarlo desde el mapa."
          },
          status: deriveAggregateStatus(cbcSubjects, statusMap),
          color:
            cbcSubjects.map((subject) => statusMap.get(subject.id)?.color).find(Boolean) ?? null,
          progress_credits: approvedCbcCredits
        }
      : null;
  const approvedFinalProjectCredits = finalProjectStages.reduce(
    (sum, stage) =>
      sum + (statusMap.get(stage.id)?.status === "aprobado" ? stage.credits ?? 0 : 0),
    0
  );
  const finalProjectRequirements = Array.from(
    new Set(
      finalProjectStages.flatMap((stage) => stage.requirements ?? []).filter(Boolean)
    )
  );
  const finalProjectNode =
    finalProjectStages.length > 0
      ? {
          id: FINAL_PROJECT_NODE_ID,
          name: "Trabajo Integrador Final",
          code: "TIF",
          term_suggested: 11,
          cycle: "segundo",
          type: "obligatoria",
          requirements: finalProjectRequirements.length ? finalProjectRequirements : ["140 créditos"],
          credits: 12,
          weekly_hours: finalProjectStages.reduce(
            (sum, stage) => sum + (stage.weekly_hours ?? 0),
            0
          ),
          total_hours: finalProjectStages.reduce(
            (sum, stage) => sum + (stage.total_hours ?? 0),
            0
          ),
          template: {
            defensas: 1,
            notas:
              "Trabajo Integrador Final de 12 créditos, con modalidad tesis o trabajo profesional."
          },
          status: deriveFinalProjectStatus(finalProjectStages, statusMap),
          color:
            finalProjectStages
              .map((stage) => statusMap.get(stage.id)?.color)
              .find(Boolean) ?? null,
          progress_credits: approvedFinalProjectCredits
        }
      : null;

  const filteredSubjects = [
    ...regularSubjects,
    ...(cbcNode ? [cbcNode] : []),
    ...(finalProjectNode ? [finalProjectNode] : [])
  ];
  const visibleSubjectIds = new Set(filteredSubjects.map((subject) => subject.id));
  const cbcUnlockedSubjects = regularSubjects.filter(
    (subject) =>
      !isCbcSubject(subject) &&
      (subject.requirements ?? []).some((requirement) =>
        requirement.toLowerCase().includes("cbc aprobado")
      )
  );

  const nodes: MapNode[] = filteredSubjects.map((subject) => {
    const syntheticFinalProject = subject.id === FINAL_PROJECT_NODE_ID;
    const syntheticCbc = subject.id === CBC_CLUSTER_NODE_ID;
    const status = syntheticFinalProject
      ? { status: finalProjectNode?.status ?? null, color: finalProjectNode?.color ?? null }
      : syntheticCbc
      ? { status: cbcNode?.status ?? null, color: cbcNode?.color ?? null }
      : statusMap.get(subject.id);
    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      term: syntheticCbc ? 1 : isCbcSubject(subject) ? 1 : subject.term_suggested,
      type: subject.type,
      cycle: subject.cycle,
      status: status?.status ?? null,
      color: status?.color ?? null,
      requirements: subject.requirements,
      credits: subject.credits,
      weekly_hours: subject.weekly_hours,
      total_hours: subject.total_hours,
      template: subject.template,
      display_kind: syntheticFinalProject
        ? ("final_project" as const)
        : syntheticCbc
        ? ("cbc_cluster" as const)
        : undefined,
      progress_credits: syntheticFinalProject
        ? finalProjectNode?.progress_credits ?? 0
        : syntheticCbc
        ? cbcNode?.progress_credits ?? 0
        : null
    };
  });

  const finalProjectStageIds = new Set(finalProjectStages.map((stage) => stage.id));

  const edges = [
    ...prerequisites
    .filter(
      (edge) =>
        visibleSubjectIds.has(edge.prerequisite_id) &&
        visibleSubjectIds.has(edge.subject_id) &&
        !finalProjectStageIds.has(edge.prerequisite_id) &&
        !finalProjectStageIds.has(edge.subject_id)
    )
    .map((edge) => ({
      from: edge.prerequisite_id,
      to: edge.subject_id
    })),
    ...(cbcNode
      ? cbcSubjects.map((subject) => ({
          from: subject.id,
          to: CBC_CLUSTER_NODE_ID
        }))
      : []),
    ...(cbcNode
      ? cbcUnlockedSubjects.map((subject) => ({
          from: CBC_CLUSTER_NODE_ID,
          to: subject.id
        }))
      : [])
  ];

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
