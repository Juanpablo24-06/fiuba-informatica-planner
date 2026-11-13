import { z } from "zod";

const eventTypes = [
  "parcial",
  "recuperatorio",
  "tp",
  "defensa",
  "final",
  "clase",
  "otro"
] as const;

export const eventTypeSchema = z.enum(eventTypes);
export const eventLinkSchema = z.object({
  label: z.string().trim().min(1),
  url: z.string().url()
});

const eventFieldsSchema = {
  type: eventTypeSchema,
  title: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  starts_at: z.iso.datetime({ offset: true }),
  ends_at: z.iso.datetime({ offset: true }).nullable().optional(),
  status: z.string().trim().nullable().optional(),
  grade: z.number().min(0).max(10).nullable().optional(),
  attempt: z.number().int().min(1).nullable().optional(),
  links: z.array(eventLinkSchema).nullable().optional()
};

export const hasValidEventRange = (event: { starts_at?: string; ends_at?: string | null }) =>
  !event.starts_at || !event.ends_at || Date.parse(event.ends_at) > Date.parse(event.starts_at);

export const eventRangeIssue = {
  path: ["ends_at"],
  message: "El fin debe ser posterior al inicio."
};

export const eventCreateSchema = z.object({
  enrollment_id: z.string().uuid(),
  ...eventFieldsSchema
}).refine(hasValidEventRange, eventRangeIssue);

export const eventUpdateSchema = z.object(eventFieldsSchema).partial().refine(hasValidEventRange, eventRangeIssue);

export type EventCreateInput = z.input<typeof eventCreateSchema>;
export type EventUpdateInput = z.input<typeof eventUpdateSchema>;
