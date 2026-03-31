import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";

const subjectBaseSchema = z.object({
  code: z.string().trim().min(1).max(32).nullable().optional(),
  name: z.string().trim().min(1),
  credits: z.number().int().min(0).nullable().optional(),
  weekly_hours: z.number().int().min(0).nullable().optional(),
  total_hours: z.number().int().min(0).nullable().optional(),
  term_suggested: z.number().int().min(1).max(10).nullable().optional(),
  cycle: z.string().trim().nullable().optional(),
  type: z.string().trim().nullable().optional(),
  requirements: z.array(z.string().trim()).nullable().optional(),
  template: z.record(z.any()).nullable().optional()
});

export const subjectCreateSchema = subjectBaseSchema;
export const subjectUpdateSchema = subjectBaseSchema.partial();

export const listSubjects = async () => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select(
      "id,code,name,credits,weekly_hours,total_hours,term_suggested,cycle,type,requirements,template"
    )
    .order("term_suggested", { ascending: true, nullsFirst: false });

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const createSubject = async (input: z.infer<typeof subjectCreateSchema>) => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateSubject = async (
  id: string,
  input: z.infer<typeof subjectUpdateSchema>
) => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const deleteSubject = async (id: string) => {
  const { error } = await supabaseAdmin.from("subjects").delete().eq("id", id);
  if (error) {
    throw error;
  }
};
