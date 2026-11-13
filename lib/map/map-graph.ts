import { type Subject } from "@/lib/types";
import {
  CBC_CLUSTER_NODE_ID,
  FINAL_PROJECT_NODE_ID,
  GENERIC_ELECTIVE_NAMES
} from "@/lib/map/map-constants";
import type { MapEdge, MapNode, MapPrerequisiteRow, MapStatusEntry } from "@/lib/map/types";

type BuildMapGraphInput = {
  prerequisites: MapPrerequisiteRow[];
  statusMap: Map<string, MapStatusEntry>;
  subjects: Subject[];
};

type StructuralSubject = Subject & {
  deleted_at?: string | null;
  term_order?: number | null;
};

const isFinalProjectStage = (subject: { name: string }) =>
  /Trabajo Integrador Final|Tesis\/Trabajo Profesional/i.test(subject.name);

const isCbcSubject = (subject: { cycle?: string | null; type?: string | null }) =>
  subject.cycle?.toLowerCase() === "cbc" || subject.type?.toLowerCase() === "cbc";

const deriveFinalProjectStatus = (
  stages: Array<{ id: string }>,
  statusMap: Map<string, MapStatusEntry>
) => {
  const stageStatuses = stages.map((stage) => statusMap.get(stage.id)).filter(Boolean);

  if (!stageStatuses.length) return null;
  if (stageStatuses.every((status) => status?.status === "aprobado")) return "aprobado";
  if (stageStatuses.some((status) => status?.status === "cursando")) return "cursando";
  if (stageStatuses.some((status) => status?.status === "final_pendiente")) return "final_pendiente";
  if (stageStatuses.some((status) => status?.status === "recursar")) return "recursar";
  return stageStatuses[0]?.status ?? null;
};

const deriveAggregateStatus = (
  subjects: Array<{ id: string }>,
  statusMap: Map<string, MapStatusEntry>
) => {
  const statuses = subjects.map((subject) => statusMap.get(subject.id)).filter(Boolean);
  if (!statuses.length) return null;
  if (statuses.every((status) => status?.status === "aprobado")) return "aprobado";
  if (statuses.some((status) => status?.status === "cursando")) return "cursando";
  if (statuses.some((status) => status?.status === "final_pendiente")) return "final_pendiente";
  if (statuses.some((status) => status?.status === "recursar")) return "recursar";
  return statuses[0]?.status ?? null;
};

export const buildMapGraph = ({ prerequisites, statusMap, subjects }: BuildMapGraphInput) => {
  // The map normally receives active subjects from the page query. Keep this
  // guard here as a defensive boundary so an archived record can never become
  // a node if another caller supplies a broader subject collection.
  const activeSubjects = (subjects as StructuralSubject[]).filter((subject) => !subject.deleted_at);
  const cbcSubjects = activeSubjects
    .filter((subject) => isCbcSubject(subject))
    .sort((a, b) => (a.term_suggested ?? 0) - (b.term_suggested ?? 0) || a.name.localeCompare(b.name));
  const finalProjectStages = activeSubjects
    .filter((subject) => isFinalProjectStage(subject))
    .sort((a, b) => (a.term_suggested ?? 0) - (b.term_suggested ?? 0));
  const regularSubjects = activeSubjects.filter(
    (subject) => !GENERIC_ELECTIVE_NAMES.has(subject.name) && !isFinalProjectStage(subject)
  );

  const approvedCbcCredits = cbcSubjects.reduce(
    (sum, subject) =>
      sum +
      (statusMap.get(subject.id)?.status === "aprobado"
        ? subject.credits ?? subject.weekly_hours ?? 0
        : 0),
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
          color: cbcSubjects.map((subject) => statusMap.get(subject.id)?.color).find(Boolean) ?? null,
          progress_credits: approvedCbcCredits
        }
      : null;

  const approvedFinalProjectCredits = finalProjectStages.reduce(
    (sum, stage) => sum + (statusMap.get(stage.id)?.status === "aprobado" ? stage.credits ?? 0 : 0),
    0
  );
  const finalProjectRequirements = Array.from(
    new Set(finalProjectStages.flatMap((stage) => stage.requirements ?? []).filter(Boolean))
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
          total_hours: finalProjectStages.reduce((sum, stage) => sum + (stage.total_hours ?? 0), 0),
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
      suggested_term: subject.term_suggested,
      term_order:
        syntheticCbc || syntheticFinalProject
          ? null
          : (subject as StructuralSubject).term_order ?? null,
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
        ? "final_project"
        : syntheticCbc
          ? "cbc_cluster"
          : undefined,
      progress_credits: syntheticFinalProject
        ? finalProjectNode?.progress_credits ?? 0
        : syntheticCbc
          ? cbcNode?.progress_credits ?? 0
          : null
    };
  });

  const finalProjectStageIds = new Set(finalProjectStages.map((stage) => stage.id));

  const normalizedEdges = prerequisites
    .filter(
      (edge) =>
        edge.prerequisite_id !== edge.subject_id &&
        visibleSubjectIds.has(edge.prerequisite_id) &&
        visibleSubjectIds.has(edge.subject_id) &&
        !finalProjectStageIds.has(edge.prerequisite_id) &&
        !finalProjectStageIds.has(edge.subject_id)
    )
    .map((edge) => ({
      from: edge.prerequisite_id,
      to: edge.subject_id
    }));

  // CBC's aggregate node is presentation-only. Preserve its existing
  // collapse behavior by deriving boundary edges from persisted relations,
  // never from the free-form `requirements` field.
  const cbcSubjectIds = new Set(cbcSubjects.map((subject) => subject.id));
  const cbcBoundaryEdges = normalizedEdges
    .filter((edge) => cbcSubjectIds.has(edge.from) && !cbcSubjectIds.has(edge.to))
    .map((edge) => ({
      from: CBC_CLUSTER_NODE_ID,
      to: edge.to
    }));

  const edgeCandidates: MapEdge[] = [
    ...normalizedEdges,
    ...(cbcNode
      ? cbcSubjects.map((subject) => ({
          from: subject.id,
          to: CBC_CLUSTER_NODE_ID
        }))
      : []),
    ...(cbcNode ? cbcBoundaryEdges : [])
  ];
  const seenEdges = new Set<string>();
  const edges = edgeCandidates.filter((edge) => {
    if (edge.from === edge.to) return false;
    if (!visibleSubjectIds.has(edge.from) && edge.from !== CBC_CLUSTER_NODE_ID) return false;
    if (!visibleSubjectIds.has(edge.to) && edge.to !== CBC_CLUSTER_NODE_ID) return false;
    const key = `${edge.from}:${edge.to}`;
    if (seenEdges.has(key)) return false;
    seenEdges.add(key);
    return true;
  });

  return {
    nodes,
    edges
  };
};
