import type { EnrollmentScheduleSlot } from "@/lib/types";
import type { PlannerEntry } from "@/lib/planner/types";
import type { PlannerSelection as DomainSelection, PlannerSubjectOption as DomainSubjectOption, PlannerSelectionSource, PlannerSelectionKind, PlannerAlignmentState, PlannerScenarioLifecycle } from "@/lib/planner/types";

export type PlanningBlock = EnrollmentScheduleSlot & {
  id?: string;
};

export type PlanningActivity = {
  id: string;
  title: string;
  kind: string;
  location: string | null;
  notes: string | null;
  color: string;
  blocks: PlanningBlock[];
};

/** View model used by the planner surfaces. Domain rows are normalized here so
 * renderers never need to know whether a row came from legacy entries or the
 * scenario API. */
export type PlanningSelection = {
  id: string;
  scenarioId: string;
  kind: PlannerSelectionKind;
  subjectId: string | null;
  enrollmentId: string | null;
  title: string;
  code: string | null;
  statusSnapshot: string | null;
  alignment: PlannerAlignmentState;
  color: string;
  notes: string | null;
  slots: PlanningBlock[];
  source: PlannerSelectionSource | "external";
  confirmedEnrollmentId: string | null;
  offerIds: string[];
  subjectName: string;
  subjectCode: string | null;
  status: string;
  statusLabel?: string;
  blockedBy?: string[];
  alignmentLabel?: string;
  reason?: string | null;
  commissionName: string | null;
  commissionNames?: string[];
  teachers: string[];
  blocks: PlanningBlock[];
};

export type PlanningScenario = {
  id: string;
  termId: string;
  profileKey: string;
  name: string;
  position: number;
  lifecycle: PlannerScenarioLifecycle;
  confirmedAt: string | null;
  selections: PlanningSelection[];
  activities: PlanningActivity[];
};

export type PlanningSubjectOption = Pick<DomainSubjectOption, "status" | "statusLabel" | "blockedBy" | "termSuggested" | "termOrder" | "code" | "name"> & {
  id: string;
  name: string;
  code: string | null;
  status: string;
  reason?: string | null;
  termSuggested?: number | null;
  source: "catalog" | "offer" | "manual";
  subjectId?: string | null;
  offer?: Record<string, unknown> | null;
  manualBlocks?: PlanningBlock[];
};

const COLORS = [
  "#e6a14b",
  "#4fa9a3",
  "#6586d8",
  "#d9765b",
  "#a98ad8",
  "#82a85a",
  "#d38ba8",
  "#5d9fc5"
];

export const planningColorFor = (key: string, used: string[] = []) => {
  const available = COLORS.filter((color) => !used.includes(color));
  const palette = available.length > 0 ? available : COLORS;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return palette[hash % palette.length] ?? COLORS[0];
};

export const normalizeSubjectOption = (value: unknown): PlanningSubjectOption | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const subject = row.subject && typeof row.subject === "object" ? row.subject as Record<string, unknown> : row;
  const id = typeof row.id === "string" ? row.id : typeof subject.id === "string" ? subject.id : null;
  const name = typeof row.name === "string" ? row.name : typeof subject.name === "string" ? subject.name : null;
  if (!id || !name) return null;
  const status = typeof row.status === "string" ? row.status : "available";
  return {
    id,
    subjectId: typeof row.subjectId === "string" ? row.subjectId : id,
    name,
    code: typeof row.code === "string" ? row.code : typeof subject.code === "string" ? subject.code : null,
    status: status as PlanningSubjectOption["status"],
    statusLabel: typeof row.statusLabel === "string" ? row.statusLabel : status,
    blockedBy: Array.isArray(row.blockedBy) ? row.blockedBy.filter((item): item is string => typeof item === "string") : [],
    termSuggested: typeof row.termSuggested === "number" ? row.termSuggested : typeof subject.term_suggested === "number" ? subject.term_suggested : null,
    termOrder: typeof row.termOrder === "number" ? row.termOrder : typeof subject.term_order === "number" ? subject.term_order : null,
    source: row.source === "manual" ? "manual" : row.source === "offer" ? "offer" : "catalog",
    offer: row.offer && typeof row.offer === "object" ? row.offer as Record<string, unknown> : null
  };
};

const asBlock = (value: unknown): PlanningBlock | null => {
  if (!value || typeof value !== "object") return null;
  const block = value as Record<string, unknown>;
  const day = typeof block.day === "string" ? block.day : null;
  const start = typeof block.start_time === "string" ? block.start_time : typeof block.startTime === "string" ? block.startTime : null;
  const end = typeof block.end_time === "string" ? block.end_time : typeof block.endTime === "string" ? block.endTime : null;
  if (!day || !start || !end) return null;
  return {
    id: typeof block.id === "string" ? block.id : undefined,
    day: day as PlanningBlock["day"],
    start_time: start,
    end_time: end,
    location: typeof block.location === "string" ? block.location : typeof block.room === "string" ? block.room : null,
    class_type: typeof block.class_type === "string" ? block.class_type as PlanningBlock["class_type"] : typeof block.classType === "string" ? block.classType as PlanningBlock["class_type"] : "other"
  };
};

const blocksFrom = (value: unknown) => Array.isArray(value) ? value.map(asBlock).filter((block): block is PlanningBlock => Boolean(block)) : [];

export const selectionFromEntry = (entry: PlannerEntry, index = 0): PlanningSelection => ({
  id: entry.id,
  scenarioId: "",
  kind: "course",
  title: entry.subjectName,
  subjectId: entry.subjectId || null,
  subjectName: entry.subjectName,
  code: entry.subjectCode,
  subjectCode: entry.subjectCode,
  status: entry.status || "planned",
  statusSnapshot: entry.status || null,
  alignment: entry.subjectId ? "linked" : "unresolved",
  notes: null,
  color: entry.color ?? planningColorFor(`${entry.subjectCode ?? entry.subjectName}-${index}`),
  commissionName: entry.commissionName,
  commissionNames: entry.commissionName ? [entry.commissionName] : [],
  teachers: entry.teachers ?? [],
  blocks: blocksFrom(entry.slots),
  slots: blocksFrom(entry.slots),
  source: entry.source === "enrollment" ? "enrollment" : "offer",
  enrollmentId: entry.enrollmentId || null,
  confirmedEnrollmentId: null,
  offerIds: []
});

export const entryFromSelection = (selection: PlanningSelection): PlannerEntry => ({
  id: selection.id,
  enrollmentId: selection.enrollmentId ?? "",
  subjectId: selection.subjectId ?? selection.subjectCode ?? selection.subjectName,
  subjectName: selection.subjectName,
  subjectCode: selection.subjectCode,
  commissionName: selection.commissionNames?.[0] ?? selection.commissionName ?? null,
  teachers: selection.teachers,
  color: selection.color,
  status: selection.status,
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: null,
  slots: selection.blocks,
  source: selection.source === "enrollment" ? "enrollment" : "import"
});

export const normalizeSelection = (value: unknown, index = 0): PlanningSelection | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.title === "string" || typeof row.subjectName === "string") return {
    id: typeof row.id === "string" ? row.id : `selection-${index}`,
    scenarioId: typeof row.scenarioId === "string" ? row.scenarioId : typeof row.scenario_id === "string" ? row.scenario_id : "",
    kind: row.kind === "personal" ? "personal" : "course",
    title: typeof row.title === "string" ? row.title : String(row.subjectName),
    subjectId: typeof row.subjectId === "string" ? row.subjectId : null,
    subjectName: typeof row.subjectName === "string" ? row.subjectName : String(row.title),
    code: typeof row.code === "string" ? row.code : typeof row.subjectCode === "string" ? row.subjectCode : null,
    subjectCode: typeof row.subjectCode === "string" ? row.subjectCode : typeof row.code === "string" ? row.code : null,
    status: typeof row.status === "string" ? row.status : typeof row.statusSnapshot === "string" ? row.statusSnapshot : "planned",
    statusSnapshot: typeof row.statusSnapshot === "string" ? row.statusSnapshot : typeof row.status === "string" ? row.status : null,
    statusLabel: typeof row.statusLabel === "string" ? row.statusLabel : undefined,
    blockedBy: Array.isArray(row.blockedBy) ? row.blockedBy.filter((item): item is string => typeof item === "string") : [],
    alignment: row.alignment === "linked" || row.alignment === "created" || row.alignment === "external" ? row.alignment : "unresolved",
    notes: typeof row.notes === "string" ? row.notes : null,
    reason: typeof row.reason === "string" ? row.reason : null,
    color: typeof row.color === "string" ? row.color : planningColorFor(`${row.subjectCode ?? row.subjectName}-${index}`),
    commissionName: typeof row.commissionName === "string" ? row.commissionName : null,
    commissionNames: Array.isArray(row.commissionNames) ? row.commissionNames.filter((item): item is string => typeof item === "string") : [],
    teachers: Array.isArray(row.teachers) ? row.teachers.filter((item): item is string => typeof item === "string") : [],
    blocks: blocksFrom(row.blocks ?? row.slots),
    slots: blocksFrom(row.slots ?? row.blocks),
    source: row.source === "enrollment" || row.source === "manual" || row.source === "external" || row.source === "import" || row.source === "personal" || row.source === "legacy" ? row.source : "offer",
    offerIds: Array.isArray(row.offerIds) ? row.offerIds.filter((item): item is string => typeof item === "string") : [],
    enrollmentId: typeof row.enrollmentId === "string" ? row.enrollmentId : null,
    confirmedEnrollmentId: typeof row.confirmedEnrollmentId === "string" ? row.confirmedEnrollmentId : null
  };
  if (typeof row.subject_name === "string") return selectionFromEntry({
    id: typeof row.id === "string" ? row.id : `selection-${index}`,
    enrollmentId: typeof row.enrollment_id === "string" ? row.enrollment_id : "",
    subjectId: typeof row.subject_id === "string" ? row.subject_id : "",
    subjectName: row.subject_name,
    subjectCode: typeof row.subject_code === "string" ? row.subject_code : null,
    commissionName: typeof row.commission_name === "string" ? row.commission_name : null,
    teachers: Array.isArray(row.teachers) ? row.teachers.filter((item): item is string => typeof item === "string") : [],
    color: typeof row.color === "string" ? row.color : null,
    status: typeof row.status === "string" ? row.status : "planned",
    effectiveFrom: typeof row.effective_from === "string" ? row.effective_from : new Date().toISOString().slice(0, 10),
    effectiveTo: typeof row.effective_to === "string" ? row.effective_to : null,
    slots: blocksFrom(row.blocks ?? row.slots),
    source: row.source === "enrollment" ? "enrollment" : "import"
  }, index);
  return null;
};

export const planningSelectionFromDomain = (selection: DomainSelection, index = 0) => normalizeSelection(selection, index);

export const emptyScenario = (termId: string, position = 0, name = "Plan A"): PlanningScenario => ({
  id: `scenario-${termId}-${position + 1}`,
  termId,
  profileKey: "default",
  name,
  position,
  lifecycle: "draft",
  confirmedAt: null,
  selections: [],
  activities: []
});
