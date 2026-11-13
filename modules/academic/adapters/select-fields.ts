export const SUBJECT_FIELDS =
  "id,code,name,credits,weekly_hours,total_hours,term_suggested,term_order,cycle,type,description,requirements,evaluation_info,notes,useful_links,custom_fields,template,deleted_at";

export const TERM_FIELDS = "id,label,start_date,end_date,is_current";

export const ENROLLMENT_FIELDS_WITH_SCHEDULE = `id,term_id,subject_id,status,color,notes,schedule,subject:subjects(${SUBJECT_FIELDS}),term:terms(${TERM_FIELDS})`;

export const ENROLLMENT_FIELDS_NO_SCHEDULE = `id,term_id,subject_id,status,color,notes,subject:subjects(${SUBJECT_FIELDS}),term:terms(${TERM_FIELDS})`;

export const EVENT_FIELDS = "id,enrollment_id,type,title,description,starts_at,ends_at,status,grade,attempt,links";

export const EVENT_WITH_ENROLLMENT_SCHEDULE = `${EVENT_FIELDS},enrollment:enrollments(id,term_id,subject_id,status,color,notes,schedule,subject:subjects(${SUBJECT_FIELDS}))`;

export const EVENT_WITH_ENROLLMENT_NO_SCHEDULE = `${EVENT_FIELDS},enrollment:enrollments(id,term_id,subject_id,status,color,notes,subject:subjects(${SUBJECT_FIELDS}))`;

export const EVENT_WITH_ENROLLMENT_SCHEDULE_AND_TERM = `${EVENT_FIELDS},enrollment:enrollments(id,term_id,subject_id,status,color,notes,schedule,subject:subjects(${SUBJECT_FIELDS}),term:terms(${TERM_FIELDS}))`;

export const EVENT_WITH_ENROLLMENT_NO_SCHEDULE_AND_TERM = `${EVENT_FIELDS},enrollment:enrollments(id,term_id,subject_id,status,color,notes,subject:subjects(${SUBJECT_FIELDS}),term:terms(${TERM_FIELDS}))`;

// Filtering an embedded relation alone does not filter the parent event rows.
export const eventFieldsForTerm = (fields: string, termId?: string | null) =>
  termId ? fields.replace("enrollment:enrollments(", "enrollment:enrollments!inner(") : fields;

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
  const mentionsSchedule = /\bschedule\b/.test(text);
  return mentionsSchedule && (
    code === "42703" ||
    code === "PGRST204" ||
    text.includes("enrollments.schedule") ||
    /column\s+["']?schedule\b/.test(text)
  );
};
