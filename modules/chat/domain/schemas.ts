import { z } from "zod";

const toNonEmptyString = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
};

const toStringList = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => toNonEmptyString(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const one = value.trim();
    return one ? [one] : [];
  }
  return [];
};

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
const eventTypeSchema = z.enum([
  "parcial",
  "recuperatorio",
  "tp",
  "defensa",
  "final",
  "clase",
  "otro"
]);

const termDateSchema = z.string().trim().min(1);

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
  }),
  z.object({
    type: z.literal("create_subject"),
    subject_query: z.string().trim().min(2).optional(),
    code: z.string().trim().max(32).nullable().optional(),
    name: z.string().trim().min(2),
    credits: z.number().int().min(0).nullable().optional(),
    weekly_hours: z.number().int().min(0).nullable().optional(),
    total_hours: z.number().int().min(0).nullable().optional(),
    term_suggested: z.number().int().positive().nullable().optional(),
    cycle: z.string().trim().nullable().optional(),
    subject_type: z.string().trim().nullable().optional(),
    requirements: z.array(z.string().trim()).nullable().optional()
  }),
  z.object({
    type: z.literal("update_subject"),
    subject_query: z.string().trim().min(2),
    code: z.string().trim().max(32).nullable().optional(),
    name: z.string().trim().min(2).optional(),
    credits: z.number().int().min(0).nullable().optional(),
    weekly_hours: z.number().int().min(0).nullable().optional(),
    total_hours: z.number().int().min(0).nullable().optional(),
    term_suggested: z.number().int().positive().nullable().optional(),
    cycle: z.string().trim().nullable().optional(),
    subject_type: z.string().trim().nullable().optional(),
    requirements: z.array(z.string().trim()).nullable().optional()
  }),
  z.object({
    type: z.literal("remove_subject"),
    subject_query: z.string().trim().min(2)
  }),
  z.object({
    type: z.literal("create_event"),
    term_label: z.string().trim().min(3),
    subject_query: z.string().trim().min(2),
    event_type: eventTypeSchema.default("otro"),
    title: z.string().trim().max(120).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    starts_at: z.string().trim().min(1),
    ends_at: z.string().trim().nullable().optional(),
    status: z.string().trim().nullable().optional(),
    grade: z.number().min(0).max(10).nullable().optional(),
    attempt: z.number().int().min(1).nullable().optional()
  }),
  z.object({
    type: z.literal("update_event"),
    term_label: z.string().trim().min(3),
    subject_query: z.string().trim().min(2),
    event_query: z.string().trim().min(2),
    event_type: eventTypeSchema.optional(),
    title: z.string().trim().max(120).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    starts_at: z.string().trim().min(1).optional(),
    ends_at: z.string().trim().nullable().optional(),
    status: z.string().trim().nullable().optional(),
    grade: z.number().min(0).max(10).nullable().optional(),
    attempt: z.number().int().min(1).nullable().optional()
  }),
  z.object({
    type: z.literal("remove_event"),
    term_label: z.string().trim().min(3),
    subject_query: z.string().trim().min(2),
    event_query: z.string().trim().min(2)
  }),
  z.object({
    type: z.literal("set_planner_commission"),
    term_label: z.string().trim().min(3),
    subject_query: z.string().trim().min(2),
    commission_query: z.string().trim().min(1),
    effective_from: termDateSchema.optional()
  }),
  z.object({
    type: z.literal("remove_planner_course"),
    term_label: z.string().trim().min(3),
    subject_query: z.string().trim().min(2),
    effective_from: termDateSchema.optional()
  })
]);

export const chatResponseSchema = z.object({
  analysis_summary: z
    .any()
    .optional()
    .transform((value) => toNonEmptyString(value).slice(0, 1200)),
  answer: z
    .any()
    .optional()
    .transform((value) => toNonEmptyString(value))
    .transform((value) => (value ? value : "Sin respuesta.")),
  follow_up_questions: z
    .any()
    .transform((value) => toStringList(value))
    .default([]),
  warnings: z
    .any()
    .transform((value) => toStringList(value))
    .default([]),
  actions: z
    .any()
    .transform((value) => (Array.isArray(value) ? value : []))
    .default([]),
  confidence: z
    .any()
    .transform((value) => {
      if (value === null || value === undefined || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    })
    .nullable()
    .optional(),
  model: z
    .any()
    .transform((value) => {
      const parsed = toNonEmptyString(value);
      return parsed || null;
    })
    .nullable()
    .optional(),
  memory_candidates: z
    .array(
      z.object({
        content: z.string().trim().min(4).max(800),
        category: z
          .enum([
            "identidad",
            "preferencias",
            "objetivos",
            "proyectos",
            "decisiones",
            "estudio",
            "general"
          ])
          .default("general"),
        confidence: z.number().min(0).max(1).default(0.5)
      })
    )
    .max(3)
    .default([]),
  memory_operations: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("update"),
          id: z.string().uuid(),
          content: z.string().trim().min(4).max(800),
          category: z
            .enum([
              "identidad",
              "preferencias",
              "objetivos",
              "proyectos",
              "decisiones",
              "estudio",
              "general"
            ])
            .optional()
        }),
        z.object({ type: z.literal("delete"), id: z.string().uuid() })
      ])
    )
    .max(3)
    .default([])
});

export type CalendarEnrichmentInput = z.infer<typeof calendarEnrichmentSchema>;
export type WeeklySummaryOutput = z.infer<typeof weeklySummarySchema>;
export type ChatResponseOutput = z.infer<typeof chatResponseSchema>;
export type ChatAdminAction = z.input<typeof chatAdminActionSchema>;
export type ReasoningLevel = z.infer<typeof reasoningLevelSchema>;
