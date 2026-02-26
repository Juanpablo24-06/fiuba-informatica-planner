export const SUBJECT_FIELDS =
  "id,code,name,credits,weekly_hours,total_hours,term_suggested,cycle,type,requirements,template";

export const TERM_FIELDS = "id,label,start_date,end_date,is_current";

export const ENROLLMENT_FIELDS_WITH_SCHEDULE = `id,term_id,subject_id,status,color,notes,schedule,subject:subjects(${SUBJECT_FIELDS}),term:terms(${TERM_FIELDS})`;

export const ENROLLMENT_FIELDS_NO_SCHEDULE = `id,term_id,subject_id,status,color,notes,subject:subjects(${SUBJECT_FIELDS}),term:terms(${TERM_FIELDS})`;

export const EVENT_FIELDS = "id,enrollment_id,type,title,description,starts_at,ends_at,status,grade,attempt,links";

export const EVENT_WITH_ENROLLMENT_SCHEDULE = `${EVENT_FIELDS},enrollment:enrollments(id,term_id,subject_id,status,color,notes,schedule,subject:subjects(${SUBJECT_FIELDS}))`;

export const EVENT_WITH_ENROLLMENT_NO_SCHEDULE = `${EVENT_FIELDS},enrollment:enrollments(id,term_id,subject_id,status,color,notes,subject:subjects(${SUBJECT_FIELDS}))`;

export const EVENT_WITH_ENROLLMENT_SCHEDULE_AND_TERM = `${EVENT_FIELDS},enrollment:enrollments(id,term_id,subject_id,status,color,notes,schedule,subject:subjects(${SUBJECT_FIELDS}),term:terms(${TERM_FIELDS}))`;

export const EVENT_WITH_ENROLLMENT_NO_SCHEDULE_AND_TERM = `${EVENT_FIELDS},enrollment:enrollments(id,term_id,subject_id,status,color,notes,subject:subjects(${SUBJECT_FIELDS}),term:terms(${TERM_FIELDS}))`;

export const isMissingEnrollmentScheduleColumn = (
  error: {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  } | null | undefined
) => {
  const code = error?.code ?? "";
  const text = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    text.includes("enrollments.schedule") ||
    text.includes("column schedule")
  );
};
