import { buildPlannerSubjectOptions } from "@/lib/planner/academic-status";
import type { Enrollment, Event, Subject, Term } from "@/lib/types";

export type CourseUsefulLink = {
  label: string;
  url: string;
};

export type CourseCustomField = {
  label: string;
  value: string;
};

/**
 * Course-facing subject shape.  The structural fields are intentionally kept
 * on the Subject record; this alias makes the UI resilient while older callers
 * still only provide the original catalog fields.
 */
export type CourseSubject = Subject & {
  description?: string | null;
  term_order?: number | null;
  evaluation_info?: string | null;
  notes?: string | null;
  useful_links?: CourseUsefulLink[] | null;
  custom_fields?: CourseCustomField[] | null;
  deleted_at?: string | null;
};

export type CourseStatus = {
  status: string | null;
  color: string | null;
  termLabel?: string | null;
};

export type CourseRelation = Pick<Subject, "id" | "code" | "name" | "term_suggested">;

export type CourseEnrollmentSnapshot = Pick<
  Enrollment,
  "id" | "status" | "color" | "notes" | "schedule"
> & {
  term: Term | null;
};

export type CourseEventSnapshot = Pick<
  Event,
  "id" | "type" | "title" | "description" | "starts_at" | "ends_at" | "status" | "grade" | "attempt" | "links"
>;

export type CourseCatalogItem = {
  subject: CourseSubject;
  status: CourseStatus | null;
  prerequisites: CourseRelation[];
  unlocks: CourseRelation[];
  currentEnrollment: CourseEnrollmentSnapshot | null;
  events: CourseEventSnapshot[];
  blockedBy?: string[];
};

export type CourseCatalogInput = {
  subjects: CourseSubject[];
  prerequisites: Array<{ subject_id: string; prerequisite_id: string }>;
  statusMap: Map<string, CourseStatus>;
  currentEnrollments?: Enrollment[];
  events?: Event[];
};

export const OFFICIAL_PLAN_SUMMARY = {
  structuralSubjects: 35,
  credits: 226,
  totalHours: 3616,
  terms: 10
} as const;

const relationFor = (subject: CourseSubject): CourseRelation => ({
  id: subject.id,
  code: subject.code,
  name: subject.name,
  term_suggested: subject.term_suggested
});

const enrollmentSnapshotFor = (enrollment: Enrollment): CourseEnrollmentSnapshot => ({
  id: enrollment.id,
  status: enrollment.status,
  color: enrollment.color,
  notes: enrollment.notes,
  schedule: enrollment.schedule,
  term: enrollment.term
});

const eventSnapshotFor = (event: Event): CourseEventSnapshot => ({
  id: event.id,
  type: event.type,
  title: event.title,
  description: event.description,
  starts_at: event.starts_at,
  ends_at: event.ends_at,
  status: event.status,
  grade: event.grade,
  attempt: event.attempt,
  links: event.links
});

export const buildCourseCatalog = ({
  subjects,
  prerequisites,
  statusMap,
  currentEnrollments = [],
  events = []
}: CourseCatalogInput): CourseCatalogItem[] => {
  const eligibility = new Map(buildPlannerSubjectOptions({ subjects, prerequisites, latestStatuses: statusMap }).map((option) => [option.subject.id, option]));
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const prerequisiteIdsBySubject = new Map<string, string[]>();
  const unlockIdsBySubject = new Map<string, string[]>();

  for (const row of prerequisites) {
    if (!subjectById.has(row.subject_id) || !subjectById.has(row.prerequisite_id)) continue;
    if (row.subject_id === row.prerequisite_id) continue;
    const prerequisiteIds = prerequisiteIdsBySubject.get(row.subject_id) ?? [];
    if (!prerequisiteIds.includes(row.prerequisite_id)) {
      prerequisiteIdsBySubject.set(row.subject_id, [...prerequisiteIds, row.prerequisite_id]);
    }
    const unlockIds = unlockIdsBySubject.get(row.prerequisite_id) ?? [];
    if (!unlockIds.includes(row.subject_id)) {
      unlockIdsBySubject.set(row.prerequisite_id, [...unlockIds, row.subject_id]);
    }
  }

  const enrollmentBySubject = new Map(
    currentEnrollments.map((enrollment) => [enrollment.subject_id, enrollment])
  );
  const eventsByEnrollment = new Map<string, Event[]>();
  for (const event of events) {
    eventsByEnrollment.set(event.enrollment_id, [
      ...(eventsByEnrollment.get(event.enrollment_id) ?? []),
      event
    ]);
  }

  return subjects
    .map((subject) => {
      const enrollment = enrollmentBySubject.get(subject.id);
      return {
        subject,
        status: statusMap.get(subject.id) ?? null,
        blockedBy: eligibility.get(subject.id)?.blockedBy ?? [],
        prerequisites: (prerequisiteIdsBySubject.get(subject.id) ?? [])
          .map((id) => subjectById.get(id))
          .filter((value): value is Subject => Boolean(value))
          .map(relationFor),
        unlocks: (unlockIdsBySubject.get(subject.id) ?? [])
          .map((id) => subjectById.get(id))
          .filter((value): value is Subject => Boolean(value))
          .map(relationFor),
        currentEnrollment: enrollment ? enrollmentSnapshotFor(enrollment) : null,
        events: enrollment
          ? (eventsByEnrollment.get(enrollment.id) ?? []).map(eventSnapshotFor)
          : []
      } satisfies CourseCatalogItem;
    })
    .sort(compareCourseItems);
};

export const compareCourseItems = (a: CourseCatalogItem, b: CourseCatalogItem) =>
  (a.subject.term_suggested ?? 99) - (b.subject.term_suggested ?? 99) ||
  (a.subject.term_order ?? 999) - (b.subject.term_order ?? 999) ||
  a.subject.name.localeCompare(b.subject.name, "es");

export const emptyCourseRelations = () => ({
  prerequisiteIds: [] as string[],
  unlockIds: [] as string[]
});

export const relationIdsFor = (course: CourseCatalogItem) => ({
  prerequisiteIds: course.prerequisites.map((relation) => relation.id),
  unlockIds: course.unlocks.map((relation) => relation.id)
});

export const courseMatchesFilter = (
  course: CourseCatalogItem,
  filter: "all" | "cursando" | "aprobadas" | "disponibles" | "cbc" | "electivas"
) => {
  if (filter === "all") return true;
  if (filter === "cursando") return course.status?.status === "cursando";
  if (filter === "aprobadas") return course.status?.status === "aprobado";
  if (filter === "disponibles") {
    return !course.blockedBy?.length && (!course.status || !["cursando", "aprobado", "final_pendiente"].includes(course.status.status ?? ""));
  }
  if (filter === "cbc") {
    return course.subject.cycle?.toLowerCase() === "cbc" || course.subject.type?.toLowerCase() === "cbc";
  }
  return course.subject.type?.toLowerCase() === "electiva";
};
