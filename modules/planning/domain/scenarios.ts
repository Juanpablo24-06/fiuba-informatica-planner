import { z } from "zod";
import type { EnrollmentScheduleSlot } from "@/modules/academic/domain/types";
import type {
  PlannerAlignmentState,
  PlannerScenario,
  PlannerScenarioLifecycle,
  PlannerSelection,
  PlannerSelectionKind,
  PlannerSelectionSource
} from "./types";

export const plannerProfileKeySchema = z.string().trim().min(1).max(120).default("default");
export const plannerScenarioIdSchema = z.string().trim().min(1).max(240);
export const plannerTermIdSchema = z.string().uuid();

const plannerDays = ["lun", "mar", "mie", "jue", "vie", "sab"] as const;
const plannerClassTypes = ["theory", "practice", "laboratory", "consultation", "other"] as const;
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horario inválido");

export const plannerSlotSchema = z.object({
  day: z.enum(plannerDays),
  start_time: timeSchema,
  end_time: timeSchema,
  location: z.string().trim().max(160).nullable().optional(),
  class_type: z.enum(plannerClassTypes).optional()
}).superRefine((slot, context) => {
  if (slot.start_time >= slot.end_time) {
    context.addIssue({ code: "custom", path: ["end_time"], message: "El fin debe ser posterior al inicio." });
  }
});

export const plannerSlotsSchema = z.array(plannerSlotSchema).max(32).default([]);

export const plannerScenarioCreateSchema = z.object({
  termId: plannerTermIdSchema,
  profileKey: plannerProfileKeySchema,
  name: z.string().trim().min(1).max(80).default("Plan A")
}).strict();

export const plannerScenarioUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  lifecycle: z.enum(["draft", "confirmed", "archived"] as const).optional(),
  action: z.enum(["empty", "reopen"] as const).optional()
}).strict().refine((input) => Boolean(input.name || input.lifecycle || input.action), {
  message: "Se requiere un cambio de escenario."
});

const plannerSelectionFieldsSchema = z.object({
  id: z.string().trim().min(1).max(240).optional(),
  kind: z.enum(["course", "personal"] as const),
  subjectId: z.string().uuid().nullable().optional(),
  enrollmentId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(180),
  code: z.string().trim().max(80).nullable().optional(),
  statusSnapshot: z.string().trim().max(64).nullable().optional(),
  alignment: z.enum(["unresolved", "linked", "created", "external"] as const).optional(),
  color: z.string().trim().max(32).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  slots: plannerSlotsSchema.optional(),
  source: z.enum(["enrollment", "offer", "manual", "import", "personal", "legacy"] as const).optional(),
  offerIds: z.array(z.string().trim().min(1).max(240)).max(32).optional()
}).strict();

export const plannerSelectionCreateSchema = plannerSelectionFieldsSchema.superRefine((input, context) => {
  if (input.kind === "personal" && (input.subjectId || input.enrollmentId)) {
    context.addIssue({ code: "custom", path: ["kind"], message: "Una actividad personal no puede apuntar a una materia o cursada." });
  }
  if (input.kind === "personal" && input.alignment && input.alignment !== "external") {
    context.addIssue({ code: "custom", path: ["alignment"], message: "Una actividad personal no requiere alineación académica." });
  }
});

export const plannerSelectionUpdateSchema = plannerSelectionFieldsSchema.omit({ id: true }).partial().superRefine((input, context) => {
  if (input.kind === "personal" && (input.subjectId || input.enrollmentId)) {
    context.addIssue({ code: "custom", path: ["kind"], message: "Una actividad personal no puede apuntar a una materia o cursada." });
  }
  if (input.kind === "personal" && input.alignment && input.alignment !== "external") {
    context.addIssue({ code: "custom", path: ["alignment"], message: "Una actividad personal no requiere alineación académica." });
  }
});

export const plannerOfferLinkSchema = z.object({
  offerIds: z.array(z.string().trim().min(1).max(240)).max(32)
}).strict();

const alignmentSchema = z.object({
  selectionId: z.string().trim().min(1).max(240),
  mode: z.enum(["linked", "created", "external"] as const),
  subjectId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(180).nullable().optional(),
  code: z.string().trim().max(80).nullable().optional(),
  termSuggested: z.number().int().positive().nullable().optional(),
  type: z.string().trim().max(80).nullable().optional()
}).strict().superRefine((input, context) => {
  if (input.mode === "linked" && !input.subjectId) {
    context.addIssue({ code: "custom", path: ["subjectId"], message: "Falta la materia existente." });
  }
});

export const plannerConfirmSchema = z.object({
  alignments: z.array(alignmentSchema).max(128)
}).strict();

export type PlannerScenarioCreateInput = z.input<typeof plannerScenarioCreateSchema>;
export type PlannerScenarioUpdateInput = z.input<typeof plannerScenarioUpdateSchema>;
export type PlannerSelectionCreateInput = z.input<typeof plannerSelectionCreateSchema>;
export type PlannerSelectionUpdateInput = z.input<typeof plannerSelectionUpdateSchema>;
export type PlannerConfirmInput = z.input<typeof plannerConfirmSchema>;
export type PlannerAlignmentInput = z.infer<typeof alignmentSchema>;

export const plannerSelectionKindValues: PlannerSelectionKind[] = ["course", "personal"];
export const plannerAlignmentValues: PlannerAlignmentState[] = ["unresolved", "linked", "created", "external"];
export const plannerSourceValues: PlannerSelectionSource[] = ["enrollment", "offer", "manual", "import", "personal", "legacy"];

const asSlots = (value: unknown): EnrollmentScheduleSlot[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((slot): slot is EnrollmentScheduleSlot => Boolean(slot && typeof slot === "object" && "day" in slot && "start_time" in slot && "end_time" in slot))
    .map((slot) => ({
      day: slot.day,
      start_time: slot.start_time,
      end_time: slot.end_time,
      location: slot.location ?? null,
      ...(slot.class_type ? { class_type: slot.class_type } : {})
    }));
};

export const mapPlannerSelectionRow = (row: Record<string, unknown>, offerIds: string[] = []): PlannerSelection => ({
  id: String(row.id),
  scenarioId: String(row.scenario_id),
  kind: row.kind === "personal" ? "personal" : "course",
  subjectId: typeof row.subject_id === "string" ? row.subject_id : null,
  enrollmentId: typeof row.enrollment_id === "string" ? row.enrollment_id : null,
  title: String(row.title ?? "Materia sin nombre"),
  code: typeof row.code === "string" ? row.code : null,
  statusSnapshot: typeof row.status_snapshot === "string" ? row.status_snapshot : null,
  alignment: plannerAlignmentValues.includes(row.alignment as PlannerAlignmentState) ? row.alignment as PlannerAlignmentState : "unresolved",
  color: typeof row.color === "string" ? row.color : null,
  notes: typeof row.notes === "string" ? row.notes : null,
  slots: asSlots(row.slots),
  source: plannerSourceValues.includes(row.source as PlannerSelectionSource) ? row.source as PlannerSelectionSource : "manual",
  confirmedEnrollmentId: typeof row.confirmed_enrollment_id === "string" ? row.confirmed_enrollment_id : null,
  offerIds
});

export const mapPlannerScenarioRow = (row: Record<string, unknown>, selections: PlannerSelection[] = []): PlannerScenario => ({
  id: String(row.id),
  termId: String(row.term_id),
  profileKey: String(row.profile_key ?? "default"),
  name: String(row.name ?? "Plan A"),
  position: Number.isFinite(Number(row.position)) ? Number(row.position) : 0,
  lifecycle: ["draft", "confirmed", "archived"].includes(String(row.lifecycle)) ? row.lifecycle as PlannerScenarioLifecycle : "draft",
  confirmedAt: typeof row.confirmed_at === "string" ? row.confirmed_at : null,
  selections
});

export const selectionReferencesMatch = (subjectId: string | null | undefined, enrollmentSubjectId: string | null | undefined) => !subjectId || !enrollmentSubjectId || subjectId === enrollmentSubjectId;

export const normalizeDuplicatedSelectionRow = (row: Record<string, unknown>, scenarioId: string, id: string) => {
  const wasLinked = row.alignment === "linked" && typeof row.subject_id === "string";
  return {
    ...row,
    id,
    scenario_id: scenarioId,
    subject_id: wasLinked ? row.subject_id : null,
    enrollment_id: null,
    alignment: wasLinked ? "linked" : "unresolved",
    confirmed_enrollment_id: null
  };
};
