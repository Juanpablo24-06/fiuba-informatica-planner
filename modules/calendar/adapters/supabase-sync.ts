import { supabaseAdmin } from "@/lib/supabase-admin";
import type { CalendarSyncRepository } from "../application/events";
export const calendarSyncRepository: CalendarSyncRepository = {
  async recordSync({ calendarId, timezone }) {
    const { error } = await supabaseAdmin.from("calendar_sources").upsert({ calendar_id: calendarId, timezone, last_synced_at: new Date().toISOString() }, { onConflict: "calendar_id" });
    if (error) throw error;
  }
};
