import { supabaseAdmin } from "@/lib/supabase-admin";

export type CalendarEnrichmentSnapshot = {
  providerEventId: string;
  kind: string | null;
  instance: string | null;
  tags: string[] | null;
  needsReview: boolean;
};

export const getCalendarEventEnrichments = async (providerEventIds: string[]) => {
  if (providerEventIds.length === 0) return new Map<string, CalendarEnrichmentSnapshot>();

  const { data, error } = await supabaseAdmin
    .from("calendar_events_raw")
    .select(
      "provider_event_id,calendar_event_enrichments(kind,instance,tags,needs_review,created_at)"
    )
    .in("provider_event_id", providerEventIds);

  if (error) {
    throw error;
  }

  const map = new Map<string, CalendarEnrichmentSnapshot>();

  (data ?? []).forEach((row: any) => {
    const providerEventId = row.provider_event_id as string | null;
    if (!providerEventId) return;
    const enrichments = (row.calendar_event_enrichments ?? []) as Array<{
      kind: string | null;
      instance: string | null;
      tags: string[] | null;
      needs_review: boolean | null;
      created_at: string | null;
    }>;
    if (!enrichments.length) return;
    const latest = enrichments
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      )[0];
    if (!latest) return;

    map.set(providerEventId, {
      providerEventId,
      kind: latest.kind ?? null,
      instance: latest.instance ?? null,
      tags: latest.tags ?? null,
      needsReview: latest.needs_review ?? false
    });
  });

  return map;
};
