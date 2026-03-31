import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const TERM_LABEL_PATTERN = /^\d{4}-(1|2)$/i;
export const HISTORIC_TERM_LABEL_PATTERN = /^\d{4}-(0|1|2)$/i;

const termBaseSchema = z.object({
  label: z.string().trim().min(3),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_current: z.boolean().optional()
});

export const termCreateSchema = termBaseSchema.extend({
  label: z.string().trim().min(3).regex(TERM_LABEL_PATTERN, "Formato inválido")
});

export const termUpdateSchema = termBaseSchema
  .extend({
    label: z
      .string()
      .trim()
      .min(3)
      .regex(HISTORIC_TERM_LABEL_PATTERN, "Formato inválido")
      .optional()
  })
  .partial();

export const clearCurrentTermsUpdate = { is_current: false } as const;

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

  return data ?? [];
};

export const createTerm = async (input: z.infer<typeof termCreateSchema>) => {
  if (input.is_current) {
    const { error: clearError } = await supabaseAdmin
      .from("terms")
      .update(clearCurrentTermsUpdate)
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (clearError) {
      throw clearError;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("terms")
    .insert(input)
    .select("id,label,start_date,end_date,is_current");

  if (error) {
    throw error;
  }

  return asSingle(data);
};

export const updateTerm = async (
  id: string,
  input: z.infer<typeof termUpdateSchema>
) => {
  if (input.is_current) {
    const { error: clearError } = await supabaseAdmin
      .from("terms")
      .update(clearCurrentTermsUpdate)
      .neq("id", id);

    if (clearError) {
      throw clearError;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("terms")
    .update(input)
    .eq("id", id)
    .select("id,label,start_date,end_date,is_current");

  if (error) {
    throw error;
  }

  return asSingle(data);
};

export const deleteTerm = async (id: string) => {
  const { error } = await supabaseAdmin.from("terms").delete().eq("id", id);
  if (error) {
    throw error;
  }
};
