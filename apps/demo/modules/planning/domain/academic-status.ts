import type { Subject } from "@/modules/academic/domain/types";
import type { PlannerAcademicStatus, PlannerSubjectOption } from "./types";

export type PlannerPrerequisiteEdge = {
  subject_id: string;
  prerequisite_id: string;
};

export type PlannerLatestStatus = string | { status?: string | null } | null | undefined;

const statusLabels: Record<PlannerAcademicStatus, string> = {
  available: "Disponible",
  blocked: "Bloqueada",
  cursando: "Cursando",
  aprobado: "Aprobada",
  final_pendiente: "Final pendiente",
  recursar: "Recursar"
};

const persistedStatuses = new Set(["cursando", "aprobado", "final_pendiente", "recursar"]);

const readStatus = (value: PlannerLatestStatus) => {
  const status = typeof value === "string" ? value : value?.status;
  return status && persistedStatuses.has(status) ? status as PlannerAcademicStatus : null;
};

export const buildPlannerSubjectOptions = ({
  subjects,
  prerequisites,
  latestStatuses
}: {
  subjects: Subject[];
  prerequisites: PlannerPrerequisiteEdge[];
  latestStatuses: Map<string, PlannerLatestStatus>;
}): PlannerSubjectOption[] => {
  const names = new Map(subjects.map((subject) => [subject.id, subject.name]));
  const prerequisitesBySubject = new Map<string, string[]>();
  prerequisites.forEach((edge) => {
    if (edge.subject_id === edge.prerequisite_id) return;
    const current = prerequisitesBySubject.get(edge.subject_id) ?? [];
    current.push(edge.prerequisite_id);
    prerequisitesBySubject.set(edge.subject_id, current);
  });

  const options = subjects.filter((subject) => !subject.deleted_at).map((subject) => {
    const persisted = readStatus(latestStatuses.get(subject.id));
    const blockedBy = (prerequisitesBySubject.get(subject.id) ?? [])
      .filter((prerequisiteId) => readStatus(latestStatuses.get(prerequisiteId)) !== "aprobado")
      .map((prerequisiteId) => names.get(prerequisiteId) ?? prerequisiteId);
    const status: PlannerAcademicStatus = persisted ?? (blockedBy.length ? "blocked" : "available");
    return {
      subject,
      status,
      statusLabel: statusLabels[status],
      blockedBy,
      termSuggested: subject.term_suggested ?? null,
      termOrder: subject.term_order ?? null,
      code: subject.code ?? null,
      name: subject.name
    };
  });

  const order: Record<PlannerAcademicStatus, number> = {
    available: 0,
    cursando: 1,
    recursar: 2,
    blocked: 3,
    final_pendiente: 4,
    aprobado: 5
  };
  return options.sort((left, right) =>
    order[left.status] - order[right.status]
      || (left.termSuggested ?? Number.MAX_SAFE_INTEGER) - (right.termSuggested ?? Number.MAX_SAFE_INTEGER)
      || (left.termOrder ?? Number.MAX_SAFE_INTEGER) - (right.termOrder ?? Number.MAX_SAFE_INTEGER)
      || left.name.localeCompare(right.name, "es")
  );
};
