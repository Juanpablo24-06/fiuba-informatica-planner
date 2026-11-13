import { supabaseAdmin } from "@/lib/supabase-admin";
import type { CalendarIntelligenceRepository, CalendarRawEvent } from "../application/intelligence";
export const calendarIntelligenceRepository: CalendarIntelligenceRepository = {
  async listEvents(range, withEnrichments) {
    const fields = "id,provider_event_id,source,title,description,location,starts_at,ends_at" + (withEnrichments ? ",calendar_event_enrichments(kind,instance,tags,needs_review,confidence,subject_id)" : "");
    const { data, error } = await supabaseAdmin.from("calendar_events_raw").select(fields).gte("starts_at", range.start).lte("starts_at", range.end).order("starts_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as CalendarRawEvent[];
  },
  async listSubjects(ids) {
    let query = supabaseAdmin.from("subjects").select("id,name,code").order("name", { ascending: true });
    if (ids) query = query.in("id", ids);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  async saveEnrichments(rows) {
    const { error } = await supabaseAdmin.from("calendar_event_enrichments").upsert(rows, { onConflict: "event_id" });
    if (error) throw new Error(error.message);
  }
};
