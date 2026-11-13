import { supabaseAdmin } from "@/lib/supabase-admin";
import { CBC_TERM_LABEL, CBC_TERM_START, CBC_TERM_END, type CbcSubject } from "../domain/bootstrap-cbc";
import type { CbcRepository } from "../application/bootstrap-cbc";

const approvedFields = { status: "aprobado", color: "#1B7C5A", notes: "CBC validado como aprobado (2023)." };
export const cbcRepository: CbcRepository = {
  async findTerm() {
    const { data, error } = await supabaseAdmin.from("terms").select("id,label").eq("label", CBC_TERM_LABEL).maybeSingle();
    if (error) throw error;
    return data;
  },
  async listSubjects() {
    const { data, error } = await supabaseAdmin.from("subjects").select("id,name,code,cycle,type").or("cycle.eq.cbc,type.eq.cbc");
    if (error) throw error;
    return (data ?? []) as CbcSubject[];
  },
  async listEnrollments(termId, ids) {
    const { data, error } = await supabaseAdmin.from("enrollments").select("subject_id,status").eq("term_id", termId).in("subject_id", ids);
    if (error) throw error;
    return data ?? [];
  },
  async createTerm() {
    const { data, error } = await supabaseAdmin.from("terms").insert({ label: CBC_TERM_LABEL, start_date: CBC_TERM_START, end_date: CBC_TERM_END, is_current: false }).select("id,label").single();
    if (error) throw error;
    return data;
  },
  async approveEnrollments(termId, ids) {
    const { data, error } = await supabaseAdmin.from("enrollments").update(approvedFields).eq("term_id", termId).in("subject_id", ids).neq("status", "aprobado").select("subject_id");
    if (error) throw error;
    return data?.length ?? 0;
  },
  async insertEnrollments(termId, ids) {
    const { error } = await supabaseAdmin.from("enrollments").insert(ids.map((subject_id) => ({ term_id: termId, subject_id, ...approvedFields })));
    if (error) throw error;
  }
};
