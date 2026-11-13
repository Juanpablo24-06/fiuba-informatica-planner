import { z } from "zod";

export const TERM_LABEL_PATTERN = /^\d{4}-(1|2)$/i;
export const HISTORIC_TERM_LABEL_PATTERN = /^\d{4}-(0|1|2)$/i;

const termBaseSchema = z.object({
  label: z.string().trim().min(3),
  start_date: z.iso.date().nullable().optional(),
  end_date: z.iso.date().nullable().optional(),
  is_current: z.boolean().optional()
});

export const hasValidTermRange = (term: { start_date?: string | null; end_date?: string | null }) =>
  !term.start_date || !term.end_date || term.start_date <= term.end_date;

export const termRangeIssue = {
  path: ["end_date"],
  message: "La fecha de fin no puede ser anterior al inicio."
};

export const termCreateSchema = termBaseSchema.extend({
  label: z.string().trim().min(3).regex(TERM_LABEL_PATTERN, "Formato inválido")
}).refine(hasValidTermRange, termRangeIssue);

export const termUpdateSchema = termBaseSchema
  .extend({
    label: z
      .string()
      .trim()
      .min(3)
      .regex(HISTORIC_TERM_LABEL_PATTERN, "Formato inválido")
      .optional()
  })
  .partial()
  .refine(hasValidTermRange, termRangeIssue);

export const clearCurrentTermsUpdate = { is_current: false } as const;
