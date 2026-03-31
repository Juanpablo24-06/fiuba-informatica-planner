import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  ENROLLMENT_FIELDS_NO_SCHEDULE,
  ENROLLMENT_FIELDS_WITH_SCHEDULE,
  isMissingEnrollmentScheduleColumn
} from "@/lib/enrollment-select";

const enrollmentScheduleDays = ["lun", "mar", "mie", "jue", "vie", "sab"] as const;
const enrollmentStatuses = [
  "cursando",
  "final_pendiente",
  "aprobado",
  "recursar"
] as const;

export const enrollmentScheduleDaySchema = z.enum(enrollmentScheduleDays);

export const enrollmentScheduleSlotSchema = z.object({
  day: enrollmentScheduleDaySchema,
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  location: z.string().trim().max(120).nullable().optional()
});

const enrollmentFieldsSchema = {
  term_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  status: z.enum(enrollmentStatuses),
  color: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  schedule: z.array(enrollmentScheduleSlotSchema).optional()
};

const enrollmentPatchFieldsSchema = {
  status: z.enum(enrollmentStatuses).optional(),
  color: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  schedule: z.array(enrollmentScheduleSlotSchema).optional()
};

export const enrollmentCreateSchema = z.object(enrollmentFieldsSchema);
export const enrollmentUpdateSchema = z.object(enrollmentPatchFieldsSchema).partial();

export type EnrollmentCreateInput = z.input<typeof enrollmentCreateSchema>;
export type EnrollmentUpdateInput = z.input<typeof enrollmentUpdateSchema>;

export const removeScheduleFromEnrollmentInput = <T extends { schedule?: unknown }>(
  input: T
): Omit<T, "schedule"> => {
  const { schedule: _ignored, ...rest } = input;
  return rest;
};

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
    return firstQuery.data ?? [];
  }

  if (!isMissingEnrollmentScheduleColumn(firstQuery.error)) {
    throw firstQuery.error;
  }

  const retry = await getEnrollmentsQuery(false, termId);
  if (retry.error) {
    throw retry.error;
  }

  return retry.data ?? [];
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
    return firstInsert.data;
  }

  if (!isMissingEnrollmentScheduleColumn(firstInsert.error)) {
    throw firstInsert.error;
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
  return createdEnrollment ? { ...createdEnrollment, schedule: [] } : createdEnrollment;
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
    return firstUpdate.data;
  }

  if (!isMissingEnrollmentScheduleColumn(firstUpdate.error)) {
    throw firstUpdate.error;
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
  return updatedEnrollment ? { ...updatedEnrollment, schedule: [] } : updatedEnrollment;
};

export const deleteEnrollment = async (id: string) => {
  const { error } = await supabaseAdmin.from("enrollments").delete().eq("id", id);
  if (error) {
    throw error;
  }
};
