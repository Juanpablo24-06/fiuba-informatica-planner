import { supabaseAdmin } from "@/lib/supabase-admin";
import { clearCurrentTermsUpdate, termCreateSchema, termUpdateSchema } from "../domain/terms";
import type { TermRepository } from "../application/ports";
import type { Term } from "../domain/types";
import type { z } from "zod";

const asSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
};

export const listTerms = async () => {
  const { data, error } = await supabaseAdmin
    .from("terms")
    .select("id,label,start_date,end_date,is_current")
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("label", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Term[];
};

export const createTerm = async (input: z.infer<typeof termCreateSchema>) => {

  const { data, error } = await supabaseAdmin
    .from("terms")
    .insert(input)
    .select("id,label,start_date,end_date,is_current");

  if (error) {
    throw error;
  }

  return asSingle(data) as Term | null;
};

export const updateTerm = async (
  id: string,
  input: z.infer<typeof termUpdateSchema>
) => {


  const { data, error } = await supabaseAdmin
    .from("terms")
    .update(input)
    .eq("id", id)
    .select("id,label,start_date,end_date,is_current");

  if (error) {
    throw error;
  }

  return asSingle(data) as Term | null;
};

export const deleteTerm = async (id: string) => {
  const { error } = await supabaseAdmin.from("terms").delete().eq("id", id);
  if (error) {
    throw error;
  }
};

export const getTermDates = async (id: string) => {
  const { data, error } = await supabaseAdmin.from("terms").select("start_date,end_date").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as { start_date: string | null; end_date: string | null } | null;
};
export const clearCurrentTerms = async (exceptId = "00000000-0000-0000-0000-000000000000") => {
  const { error } = await supabaseAdmin.from("terms").update(clearCurrentTermsUpdate).neq("id", exceptId);
  if (error) throw error;
};
export const termRepository: TermRepository = { list: listTerms, create: createTerm, update: updateTerm, delete: deleteTerm, getDates: getTermDates, clearCurrent: clearCurrentTerms };
