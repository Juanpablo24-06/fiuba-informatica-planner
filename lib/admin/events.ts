import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  EVENT_WITH_ENROLLMENT_NO_SCHEDULE,
  EVENT_WITH_ENROLLMENT_SCHEDULE,
  isMissingEnrollmentScheduleColumn
} from "@/lib/enrollment-select";

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
  starts_at: z.string().min(1),
  ends_at: z.string().nullable().optional(),
  status: z.string().trim().nullable().optional(),
  grade: z.number().min(0).max(10).nullable().optional(),
  attempt: z.number().int().min(1).nullable().optional(),
  links: z.array(eventLinkSchema).nullable().optional()
};

export const eventCreateSchema = z.object({
  enrollment_id: z.string().uuid(),
  ...eventFieldsSchema
});

export const eventUpdateSchema = z.object(eventFieldsSchema).partial();

export type EventCreateInput = z.input<typeof eventCreateSchema>;
export type EventUpdateInput = z.input<typeof eventUpdateSchema>;

const loadEvents = async ({
  withSchedule,
  termId,
  enrollmentId
}: {
  withSchedule: boolean;
  termId?: string | null;
  enrollmentId?: string | null;
}) => {
  let query = supabaseAdmin
    .from("events")
    .select(withSchedule ? EVENT_WITH_ENROLLMENT_SCHEDULE : EVENT_WITH_ENROLLMENT_NO_SCHEDULE)
    .order("starts_at", { ascending: true });

  if (termId) {
    query = query.eq("enrollment.term_id", termId);
  }
  if (enrollmentId) {
    query = query.eq("enrollment_id", enrollmentId);
  }

  return query;
};

const loadEventById = async (id: string, withSchedule: boolean) =>
  supabaseAdmin
    .from("events")
    .select(
      withSchedule ? EVENT_WITH_ENROLLMENT_SCHEDULE : EVENT_WITH_ENROLLMENT_NO_SCHEDULE
    )
    .eq("id", id)
    .single();

const loadEventByIdWithFallback = async (id: string) => {
  const firstFetch = await loadEventById(id, true);
  if (!firstFetch.error) {
    return firstFetch.data;
  }

  if (!isMissingEnrollmentScheduleColumn(firstFetch.error)) {
    throw firstFetch.error;
  }

  const retry = await loadEventById(id, false);
  if (retry.error) {
    throw retry.error;
  }

  return retry.data;
};

export const listEvents = async ({
  termId,
  enrollmentId
}: {
  termId?: string | null;
  enrollmentId?: string | null;
}) => {
  const firstQuery = await loadEvents({ withSchedule: true, termId, enrollmentId });
  if (!firstQuery.error) {
    return firstQuery.data ?? [];
  }

  if (!isMissingEnrollmentScheduleColumn(firstQuery.error)) {
    throw firstQuery.error;
  }

  const retry = await loadEvents({ withSchedule: false, termId, enrollmentId });
  if (retry.error) {
    throw retry.error;
  }

  return retry.data ?? [];
};

export const createEvent = async (input: EventCreateInput) => {
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("events")
    .insert(input)
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(insertError?.message ?? "No se pudo crear el evento.");
  }

  return await loadEventByIdWithFallback(inserted.id);
};

export const updateEvent = async (id: string, patch: EventUpdateInput) => {
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("events")
    .update(patch)
    .eq("id", id)
    .select("id")
    .single();

  if (updateError || !updated?.id) {
    throw new Error(updateError?.message ?? "No se pudo actualizar el evento.");
  }

  return await loadEventByIdWithFallback(updated.id);
};

export const deleteEvent = async (id: string) => {
  const { error } = await supabaseAdmin.from("events").delete().eq("id", id);
  if (error) {
    throw error;
  }
};
