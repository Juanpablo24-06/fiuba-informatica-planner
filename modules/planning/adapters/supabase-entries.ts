import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PlannerEntryRecord, PlannerEntryRepository, PlannerOfferRecord } from "../application/entries";
export const plannerEntryRepository: PlannerEntryRepository = {
  async listEntries(term, profile) {
    const { data, error } = await supabaseAdmin.from("planner_entries").select("*").eq("term_id", term).eq("profile_key", profile).order("effective_from");
    if (error) throw error;
    return (data ?? []) as PlannerEntryRecord[];
  },
  async removeEntries(ids) { const { error } = await supabaseAdmin.from("planner_entries").delete().in("id", ids); if (error) throw error; },
  async saveEntries(rows) { const { data, error } = await supabaseAdmin.from("planner_entries").upsert(rows, { onConflict: "id" }).select("*"); if (error) throw error; return (data ?? []) as PlannerEntryRecord[]; },
  async updateEntry(id, patch) { const { error } = await supabaseAdmin.from("planner_entries").update(patch).eq("id", id); if (error) throw error; },
  async insertEntry(row) { const { error } = await supabaseAdmin.from("planner_entries").insert(row); if (error) throw error; },
  async listOffers(term, profile) { const { data, error } = await supabaseAdmin.from("planner_offers").select("*").eq("term_id", term).eq("profile_key", profile).order("activity").order("commission_name"); if (error) throw error; return (data ?? []) as PlannerOfferRecord[]; },
  async removeOffers(term, profile) { const { error } = await supabaseAdmin.from("planner_offers").delete().eq("term_id", term).eq("profile_key", profile); if (error) throw error; },
  async insertOffers(rows) { const { error } = await supabaseAdmin.from("planner_offers").insert(rows); if (error) throw error; }
};
