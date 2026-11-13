import { supabaseAdmin } from "@/lib/supabase-admin";
import { removeScheduleFromEnrollmentInput, type EnrollmentCreateInput, type EnrollmentUpdateInput } from "../domain/enrollments";
import type { EnrollmentRecord, EnrollmentRepository } from "../application/ports";
import { ENROLLMENT_FIELDS_NO_SCHEDULE, ENROLLMENT_FIELDS_WITH_SCHEDULE, isMissingEnrollmentScheduleColumn } from "@/lib/enrollment-select";
const getEnrollmentsQuery = (withSchedule: boolean, termId?: string | null) => {
  let query = supabaseAdmin
    .from("enrollments")
    .select(
      withSchedule ? ENROLLMENT_FIELDS_WITH_SCHEDULE : ENROLLMENT_FIELDS_NO_SCHEDULE
    )
    .order("name", { foreignTable: "subjects", ascending: true });

  if (termId) {
    query = query.eq("term_id", termId);
  }

  return query;
};

export const listEnrollments = async (termId?: string | null) => {
  const firstQuery = await getEnrollmentsQuery(true, termId);
  if (!firstQuery.error) {
    return (firstQuery.data ?? []) as unknown as EnrollmentRecord[];
  }

  if (!isMissingEnrollmentScheduleColumn(firstQuery.error)) {
    throw firstQuery.error;
  }

  const retry = await getEnrollmentsQuery(false, termId);
  if (retry.error) {
    throw retry.error;
  }

  return (retry.data ?? []) as unknown as EnrollmentRecord[];
};

const scheduleColumnMigrationError = () =>
  Object.assign(
    new Error(
      "La base local todavía no tiene la columna schedule. Ejecutá la migración 003_enrollment_schedule.sql."
    ),
    { status: 409 }
  );

export const createEnrollment = async (input: EnrollmentCreateInput) => {
  const payloadWithSchedule = {
    ...input,
    schedule: input.schedule ?? []
  };

  const firstInsert = await supabaseAdmin
    .from("enrollments")
    .insert(payloadWithSchedule)
    .select(ENROLLMENT_FIELDS_WITH_SCHEDULE)
    .single();

  if (!firstInsert.error) {
    return firstInsert.data as unknown as EnrollmentRecord | null;
  }

  if (!isMissingEnrollmentScheduleColumn(firstInsert.error)) {
    throw firstInsert.error;
  }

  if (payloadWithSchedule.schedule.length > 0) {
    throw scheduleColumnMigrationError();
  }

  const payloadWithoutSchedule = removeScheduleFromEnrollmentInput(payloadWithSchedule);
  const retry = await supabaseAdmin
    .from("enrollments")
    .insert(payloadWithoutSchedule)
    .select(ENROLLMENT_FIELDS_NO_SCHEDULE)
    .single();

  if (retry.error) {
    throw retry.error;
  }

  const createdEnrollment = retry.data as Record<string, unknown> | null;
  return (createdEnrollment ? { ...createdEnrollment, schedule: [] } : createdEnrollment) as EnrollmentRecord | null;
};

export const updateEnrollment = async (
  id: string,
  patch: EnrollmentUpdateInput
) => {
  const firstUpdate = await supabaseAdmin
    .from("enrollments")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (!firstUpdate.error) {
    return firstUpdate.data as unknown as EnrollmentRecord | null;
  }

  if (!isMissingEnrollmentScheduleColumn(firstUpdate.error)) {
    throw firstUpdate.error;
  }

  if (patch.schedule?.length) {
    throw scheduleColumnMigrationError();
  }

  const patchWithoutSchedule = removeScheduleFromEnrollmentInput(patch);
  if (Object.keys(patchWithoutSchedule).length === 0) {
    throw scheduleColumnMigrationError();
  }

  const retry = await supabaseAdmin
    .from("enrollments")
    .update(patchWithoutSchedule)
    .eq("id", id)
    .select()
    .single();

  if (retry.error) {
    throw retry.error;
  }

  const updatedEnrollment = retry.data as Record<string, unknown> | null;
  return (updatedEnrollment ? { ...updatedEnrollment, schedule: [] } : updatedEnrollment) as EnrollmentRecord | null;
};

export const deleteEnrollment = async (id: string) => {
  const { error } = await supabaseAdmin.from("enrollments").delete().eq("id", id);
  if (error) {
    throw error;
  }
};
export const enrollmentRepository: EnrollmentRepository = { list: listEnrollments, create: createEnrollment, update: updateEnrollment, delete: deleteEnrollment };
