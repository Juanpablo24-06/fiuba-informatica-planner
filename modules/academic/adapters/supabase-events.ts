import { supabaseAdmin } from "@/lib/supabase-admin";
import type { EventCreateInput, EventUpdateInput } from "../domain/events";
import type { EventRepository } from "../application/ports";
import type { Event } from "../domain/types";
import { EVENT_WITH_ENROLLMENT_NO_SCHEDULE, EVENT_WITH_ENROLLMENT_SCHEDULE, eventFieldsForTerm, isMissingEnrollmentScheduleColumn } from "@/lib/enrollment-select";
const loadEvents = async ({
  withSchedule,
  termId,
  enrollmentId
}: {
  withSchedule: boolean;
  termId?: string | null;
  enrollmentId?: string | null;
}) => {
  const fields = withSchedule ? EVENT_WITH_ENROLLMENT_SCHEDULE : EVENT_WITH_ENROLLMENT_NO_SCHEDULE;
  let query = supabaseAdmin
    .from("events")
    .select(eventFieldsForTerm(fields, termId))
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
    return firstFetch.data as unknown as Event;
  }

  if (!isMissingEnrollmentScheduleColumn(firstFetch.error)) {
    throw firstFetch.error;
  }

  const retry = await loadEventById(id, false);
  if (retry.error) {
    throw retry.error;
  }

  return retry.data as unknown as Event;
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
    return (firstQuery.data ?? []) as unknown as Event[];
  }

  if (!isMissingEnrollmentScheduleColumn(firstQuery.error)) {
    throw firstQuery.error;
  }

  const retry = await loadEvents({ withSchedule: false, termId, enrollmentId });
  if (retry.error) {
    throw retry.error;
  }

  return (retry.data ?? []) as unknown as Event[];
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

export const getEventDates = async (id: string) => {
  const { data, error } = await supabaseAdmin.from("events").select("starts_at,ends_at").eq("id", id).single();
  if (error) throw error;
  return data as { starts_at: string; ends_at: string | null };
};
export const eventRepository: EventRepository = { list: listEvents, create: createEvent, update: updateEvent, delete: deleteEvent, getDates: getEventDates };
