import { z } from "zod";

export const calendarEnrichmentSchema = z.object({
  provider_event_id: z.string().min(1),
  kind: z.string().min(1).nullable().optional(),
  subject_id: z.string().uuid().nullable().optional(),
  instance: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(5).nullable().optional(),
  tags: z.array(z.string().min(1)).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  needs_review: z.boolean().optional().default(false),
  explanation_short: z.string().max(280).nullable().optional(),
  model: z.string().nullable().optional()
});

export const calendarEnrichmentBatchSchema = z.object({
  enrichments: z.array(calendarEnrichmentSchema)
});

export const weeklySummarySchema = z.object({
  week_start: z.string().min(1),
  week_end: z.string().min(1),
  title: z.string().min(1).nullable().optional(),
  highlights: z.array(z.string().min(1)).default([]),
  deadlines: z.array(z.string().min(1)).default([]),
  risks: z.array(z.string().min(1)).default([]),
  focus_subjects: z.array(z.string().min(1)).default([]),
  action_items: z.array(z.string().min(1)).default([]),
  confidence: z.number().min(0).max(1).nullable().optional(),
  model: z.string().nullable().optional()
});

export const reasoningLevelSchema = z.enum(["bajo", "medio", "alto"]);

const enrollmentStatusSchema = z.enum([
  "cursando",
  "final_pendiente",
  "aprobado",
  "recursar"
]);

const termDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

export const chatAdminActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_term"),
    term_label: z.string().trim().min(3),
    start_date: termDateSchema.nullable().optional(),
    end_date: termDateSchema.nullable().optional(),
    is_current: z.boolean().optional()
  }),
  z.object({
    type: z.literal("update_term"),
    term_label: z.string().trim().min(3),
    start_date: termDateSchema.nullable().optional(),
    end_date: termDateSchema.nullable().optional(),
    is_current: z.boolean().optional()
  }),
  z.object({
    type: z.literal("set_current_term"),
    term_label: z.string().trim().min(3)
  }),
  z.object({
    type: z.literal("add_enrollment"),
    term_label: z.string().trim().min(3),
    subject_query: z.string().trim().min(2),
    status: enrollmentStatusSchema.default("cursando"),
    color: z.string().trim().min(4).max(16).nullable().optional(),
    notes: z.string().trim().max(400).nullable().optional()
  }),
  z.object({
    type: z.literal("update_enrollment_status"),
    term_label: z.string().trim().min(3),
    subject_query: z.string().trim().min(2),
    status: enrollmentStatusSchema,
    notes: z.string().trim().max(400).nullable().optional()
  }),
  z.object({
    type: z.literal("remove_enrollment"),
    term_label: z.string().trim().min(3),
    subject_query: z.string().trim().min(2)
  })
]);

export const chatResponseSchema = z.object({
  answer: z.string().min(1),
  follow_up_questions: z.array(z.string().min(1)).default([]),
  warnings: z.array(z.string().min(1)).default([]),
  reasoning: z.string().min(1).nullable().optional(),
  actions: z.array(chatAdminActionSchema).max(5).default([]),
  confidence: z.number().min(0).max(1).nullable().optional(),
  model: z.string().nullable().optional()
});

export type CalendarEnrichmentInput = z.infer<typeof calendarEnrichmentSchema>;
export type WeeklySummaryOutput = z.infer<typeof weeklySummarySchema>;
export type ChatResponseOutput = z.infer<typeof chatResponseSchema>;
export type ChatAdminAction = z.input<typeof chatAdminActionSchema>;
export type ReasoningLevel = z.infer<typeof reasoningLevelSchema>;
