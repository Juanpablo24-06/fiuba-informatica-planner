import type { Enrollment, Event, Subject, Term } from "@/modules/academic/domain/types";

const asSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
};

export const mapEnrollmentRow = ({
  row,
  hasSchedule,
  term
}: {
  row: any;
  hasSchedule: boolean;
  term?: Term | null;
}): Enrollment => {
  const subject = mapSubjectRow(row?.subject);
  const resolvedTerm =
    term === undefined ? asSingle<Term>(row?.term) ?? null : term;

  return {
    id: row.id,
    term_id: row.term_id,
    subject_id: row.subject_id,
    status: row.status,
    color: row.color ?? null,
    notes: row.notes ?? null,
    schedule:
      hasSchedule && Array.isArray(row.schedule) ? row.schedule : [],
    subject: subject as Subject,
    term: resolvedTerm
  };
};

export const mapSubjectRow = (row: any): Subject | null => {
  const subject = asSingle<Subject>(row);
  if (!subject) return null;
  return {
    ...subject,
    description: subject.description ?? null,
    term_order: subject.term_order ?? null,
    evaluation_info: subject.evaluation_info ?? null,
    notes: subject.notes ?? null,
    useful_links: Array.isArray(subject.useful_links) ? subject.useful_links : [],
    custom_fields: Array.isArray(subject.custom_fields) ? subject.custom_fields : [],
    deleted_at: subject.deleted_at ?? null
  };
};

export const mapEventRow = ({
  row,
  hasSchedule,
  includeTerm = false
}: {
  row: any;
  hasSchedule: boolean;
  includeTerm?: boolean;
}): Event => {
  const enrollmentRaw = asSingle<any>(row?.enrollment);
  const enrollment = enrollmentRaw
    ? mapEnrollmentRow({
        row: enrollmentRaw,
        hasSchedule,
        term: includeTerm ? asSingle<Term>(enrollmentRaw?.term) : null
      })
    : undefined;

  return {
    id: row.id,
    enrollment_id: row.enrollment_id,
    type: row.type,
    title: row.title ?? null,
    description: row.description ?? null,
    starts_at: row.starts_at,
    ends_at: row.ends_at ?? null,
    status: row.status ?? null,
    grade: row.grade ?? null,
    attempt: row.attempt ?? null,
    links: row.links ?? null,
    enrollment
  };
};
