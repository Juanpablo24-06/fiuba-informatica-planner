import { supabaseAdmin } from "@/lib/supabase-admin";
import { subjectCreateSchema, subjectUpdateSchema } from "../domain/subjects";
import type { z } from "zod";
import type { SubjectRepository } from "../application/ports";
export const SUBJECT_SELECT_FIELDS =
  "id,code,name,credits,weekly_hours,total_hours,term_suggested,term_order,cycle,type,description,requirements,evaluation_info,notes,useful_links,custom_fields,template,deleted_at";

const normalizeSubject = (subject: any) => ({
  ...subject,
  description: subject?.description ?? null,
  term_order: subject?.term_order ?? null,
  evaluation_info: subject?.evaluation_info ?? null,
  notes: subject?.notes ?? null,
  useful_links: Array.isArray(subject?.useful_links) ? subject.useful_links : [],
  custom_fields: Array.isArray(subject?.custom_fields) ? subject.custom_fields : [],
  deleted_at: subject?.deleted_at ?? null
});

const subjectQuery = () =>
  supabaseAdmin
    .from("subjects")
    .select(SUBJECT_SELECT_FIELDS)
    .order("term_suggested", { ascending: true, nullsFirst: false })
    .order("term_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

export const listSubjects = async ({ includeDeleted = false }: { includeDeleted?: boolean } = {}) => {
  let query = subjectQuery();
  query = includeDeleted ? query : query.is("deleted_at", null);
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeSubject);
};

export const listDeletedSubjects = async () => {
  const { data, error } = await subjectQuery().not("deleted_at", "is", null);
  if (error) throw error;
  return (data ?? []).map(normalizeSubject);
};

export const createSubject = async (input: z.infer<typeof subjectCreateSchema>) => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .insert({
      ...input,
      useful_links: input.useful_links ?? [],
      custom_fields: input.custom_fields ?? [],
      deleted_at: null
    })
    .select(SUBJECT_SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return normalizeSubject(data);
};

export const updateSubject = async (
  id: string,
  input: z.infer<typeof subjectUpdateSchema>
) => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .update(input)
    .eq("id", id)
    .is("deleted_at", null)
    .select(SUBJECT_SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return normalizeSubject(data);
};

export const deleteSubject = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(SUBJECT_SELECT_FIELDS)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeSubject(data) : null;
};

export const restoreSubject = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select(SUBJECT_SELECT_FIELDS)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeSubject(data) : null;
};

type SubjectRelationRow = {
  subject_id: string;
  prerequisite_id: string;
};

export const activeRelationIds = async (ids: string[]) => {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Set<string>();

  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("id")
    .in("id", uniqueIds)
    .is("deleted_at", null);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.id as string));
};

export const getSubjectRelations = async (subjectId: string) => {
  const { data, error } = await supabaseAdmin
    .from("subject_prerequisites")
    .select("subject_id,prerequisite_id")
    .or(`subject_id.eq.${subjectId},prerequisite_id.eq.${subjectId}`);

  if (error) throw error;
  const rows = (data ?? []) as SubjectRelationRow[];
  const counterpartIds = rows.map((row) =>
    row.subject_id === subjectId ? row.prerequisite_id : row.subject_id
  );
  const activeIds = await activeRelationIds(counterpartIds);
  const visibleRows = rows.filter((row) =>
    activeIds.has(row.subject_id === subjectId ? row.prerequisite_id : row.subject_id)
  );
  return {
    prerequisiteIds: visibleRows
      .filter((row) => row.subject_id === subjectId)
      .map((row) => row.prerequisite_id),
    unlockIds: visibleRows
      .filter((row) => row.prerequisite_id === subjectId)
      .map((row) => row.subject_id)
  };
};

export const replaceSubjectRelations = async ({
  subjectId,
  prerequisiteIds,
  unlockIds
}: {
  subjectId: string;
  prerequisiteIds: string[];
  unlockIds: string[];
}) => {
  const { data, error } = await supabaseAdmin.rpc("replace_subject_relations", {
    p_subject_id: subjectId,
    p_prerequisite_ids: [...new Set(prerequisiteIds)],
    p_unlock_ids: [...new Set(unlockIds)]
  });

  if (error) throw error;
  const rows = (data ?? []) as SubjectRelationRow[];
  return {
    prerequisiteIds: rows
      .filter((row) => row.subject_id === subjectId)
      .map((row) => row.prerequisite_id),
    unlockIds: rows
      .filter((row) => row.prerequisite_id === subjectId)
      .map((row) => row.subject_id)
  };
};

export const subjectRepository: SubjectRepository = { list: listSubjects, listDeleted: listDeletedSubjects, create: createSubject, update: updateSubject, delete: deleteSubject, restore: restoreSubject, getRelations: getSubjectRelations, replaceRelations: replaceSubjectRelations, activeIds: activeRelationIds };
