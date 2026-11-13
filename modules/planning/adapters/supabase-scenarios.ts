import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PlannerRepository, RepositoryResult } from "../application/ports";
import { PlannerSchemaUnavailableError } from "../domain/errors";

export const isPlannerSchemaMissing = (error: { code?: string | null; message?: string | null; details?: string | null } | null | undefined) => {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  return error?.code === "42P01" || error?.code === "PGRST205" || error?.code === "42883" || /planner_(scenarios|selections|selection_offers)|confirm_planner_scenario/.test(text) && /does not exist|not find|schema cache/.test(text);
};

const result = async <T>(query: PromiseLike<{ data: unknown; error: { message: string; code?: string; details?: string } | null }>): Promise<RepositoryResult<T>> => {
  const response = await query;
  const error = response.error
    ? isPlannerSchemaMissing(response.error) ? new PlannerSchemaUnavailableError() : new Error(response.error.message)
    : null;
  return { data: response.data as T | null, error };
};

export const plannerRepository: PlannerRepository = {
  findSubject: (id) => result(supabaseAdmin.from("subjects").select("id").eq("id", id).is("deleted_at", null).maybeSingle()),
  findEnrollment: (id) => result(supabaseAdmin.from("enrollments").select("id,term_id,subject_id").eq("id", id).maybeSingle()),
  listScenarios: (termId, profileKey, activeOnly = false, exceptId) => {
    let query = supabaseAdmin.from("planner_scenarios").select("*").eq("term_id", termId).eq("profile_key", profileKey);
    if (activeOnly) query = query.neq("lifecycle", "archived");
    if (exceptId) query = query.neq("id", exceptId);
    return result(query.order("position", { ascending: true }).order("created_at", { ascending: true }));
  },
  findScenario: (id, profile) => result(supabaseAdmin.from("planner_scenarios").select("*").eq("id", id).eq("profile_key", profile).maybeSingle()),
  lastPosition: (term, profile) => result(supabaseAdmin.from("planner_scenarios").select("position").eq("term_id", term).eq("profile_key", profile).order("position", { ascending: false }).limit(1).maybeSingle()),
  insertScenario: (row) => result(supabaseAdmin.from("planner_scenarios").insert(row).select("*").single()),
  updateScenario: (id, profile, patch) => result(supabaseAdmin.from("planner_scenarios").update(patch).eq("id", id).eq("profile_key", profile).select("*").single()),
  listSelections: (id) => result(supabaseAdmin.from("planner_selections").select("*").eq("scenario_id", id)),
  listSelectionsForScenarios: (ids) => result(supabaseAdmin.from("planner_selections").select("*").in("scenario_id", ids)),
  findSelection: (id, scenarioId) => {
    let query = supabaseAdmin.from("planner_selections").select("id,scenario_id,subject_id,enrollment_id,kind").eq("id", id);
    if (scenarioId) query = query.eq("scenario_id", scenarioId);
    return result(query.maybeSingle());
  },
  insertSelection: (row) => result(supabaseAdmin.from("planner_selections").insert(row).select("*").single()),
  insertSelections: (rows) => result(supabaseAdmin.from("planner_selections").insert(rows)),
  updateSelection: (id, scenario, patch) => result(supabaseAdmin.from("planner_selections").update(patch).eq("id", id).eq("scenario_id", scenario).select("*").single()),
  deleteSelection: (id, scenario) => result(supabaseAdmin.from("planner_selections").delete().eq("id", id).eq("scenario_id", scenario)),
  deleteSelections: (scenario) => result(supabaseAdmin.from("planner_selections").delete().eq("scenario_id", scenario)),
  listOfferLinks: (ids) => result(supabaseAdmin.from("planner_selection_offers").select("selection_id,offer_id,sort_order,role").in("selection_id", ids)),
  listSelectionOffers: (id) => result(supabaseAdmin.from("planner_selection_offers").select("offer_id").eq("selection_id", id).order("sort_order", { ascending: true })),
  findOffers: (term, profile, ids) => result(supabaseAdmin.from("planner_offers").select("id").eq("term_id", term).eq("profile_key", profile).in("id", ids)),
  deleteOfferLinks: (id) => result(supabaseAdmin.from("planner_selection_offers").delete().eq("selection_id", id)),
  insertOfferLinks: (rows) => result(supabaseAdmin.from("planner_selection_offers").insert(rows)),
  confirmScenario: (id, profile, alignments) => result(supabaseAdmin.rpc("confirm_planner_scenario", { p_scenario_id: id, p_profile_key: profile, p_alignments: alignments }))
};
