import type { EnrollmentScheduleSlot, Event, Enrollment, Subject } from "@/modules/academic/domain/types";

export type PlannerView = "week" | "month" | "planning";

export type PlannerEntry = {
  id: string;
  enrollmentId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  commissionName: string | null;
  teachers: string[];
  color: string | null;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  slots: EnrollmentScheduleSlot[];
  source: "enrollment" | "import";
};

export const PLANNER_SCENARIO_LIFECYCLES = ["draft", "confirmed", "archived"] as const;
export type PlannerScenarioLifecycle = (typeof PLANNER_SCENARIO_LIFECYCLES)[number];

export const PLANNER_SELECTION_KINDS = ["course", "personal"] as const;
export type PlannerSelectionKind = (typeof PLANNER_SELECTION_KINDS)[number];

export const PLANNER_ALIGNMENT_STATES = ["unresolved", "linked", "created", "external"] as const;
export type PlannerAlignmentState = (typeof PLANNER_ALIGNMENT_STATES)[number];

export const PLANNER_SELECTION_SOURCES = ["enrollment", "offer", "manual", "import", "personal", "legacy"] as const;
export type PlannerSelectionSource = (typeof PLANNER_SELECTION_SOURCES)[number];

export type PlannerSelection = {
  id: string;
  scenarioId: string;
  kind: PlannerSelectionKind;
  subjectId: string | null;
  enrollmentId: string | null;
  title: string;
  code: string | null;
  statusSnapshot: string | null;
  alignment: PlannerAlignmentState;
  color: string | null;
  notes: string | null;
  slots: EnrollmentScheduleSlot[];
  source: PlannerSelectionSource;
  confirmedEnrollmentId: string | null;
  offerIds: string[];
};

export type PlannerScenario = {
  id: string;
  termId: string;
  profileKey: string;
  name: string;
  position: number;
  lifecycle: PlannerScenarioLifecycle;
  confirmedAt: string | null;
  selections: PlannerSelection[];
};

export type PlannerAcademicStatus =
  | "available"
  | "blocked"
  | "cursando"
  | "aprobado"
  | "final_pendiente"
  | "recursar";

export type PlannerSubjectOption = {
  subject: Subject;
  status: PlannerAcademicStatus;
  statusLabel: string;
  blockedBy: string[];
  termSuggested: number | null;
  termOrder: number | null;
  code: string | null;
  name: string;
};

export type PlannerPayload = {
  termId: string | null;
  entries: PlannerEntry[];
  scenarios?: PlannerScenario[];
  activeScenarioId?: string | null;
};

export type PlannerCalendarItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  kind: "class" | "event";
  color: string | null;
  subjectName?: string;
  location?: string | null;
};

export const plannerEntriesFromEnrollments = (enrollments: Enrollment[], date: string) =>
  enrollments
    .filter((enrollment) => enrollment.schedule.length > 0)
    .map<PlannerEntry>((enrollment) => ({
      id: `enrollment-${enrollment.id}`,
      enrollmentId: enrollment.id,
      subjectId: enrollment.subject_id,
      subjectName: enrollment.subject.name,
      subjectCode: enrollment.subject.code,
      commissionName: null,
      teachers: [],
      color: enrollment.color,
      status: enrollment.status,
      effectiveFrom: date,
      effectiveTo: null,
      slots: enrollment.schedule,
      source: "enrollment"
    }));

export const plannerEventsFromEvents = (events: Event[]) =>
  events.map<PlannerCalendarItem>((event) => ({
    id: event.id,
    title: event.title ?? event.type,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    kind: "event",
    color: event.enrollment?.color ?? null,
    subjectName: event.enrollment?.subject.name
  }));
