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

export const chatResponseSchema = z.object({
  answer: z.string().min(1),
  follow_up_questions: z.array(z.string().min(1)).default([]),
  warnings: z.array(z.string().min(1)).default([]),
  reasoning: z.string().min(1).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  model: z.string().nullable().optional()
});

export type CalendarEnrichmentInput = z.infer<typeof calendarEnrichmentSchema>;
export type WeeklySummaryOutput = z.infer<typeof weeklySummarySchema>;
export type ChatResponseOutput = z.infer<typeof chatResponseSchema>;
