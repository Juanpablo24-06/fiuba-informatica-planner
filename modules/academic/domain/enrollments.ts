import { z } from "zod";

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
}).refine((slot) => slot.start_time < slot.end_time, {
  path: ["end_time"],
  message: "El fin debe ser posterior al inicio."
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
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== "schedule")
  ) as Omit<T, "schedule">;
};
