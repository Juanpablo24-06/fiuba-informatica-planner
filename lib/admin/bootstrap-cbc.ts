import { supabaseAdmin } from "@/lib/supabase-admin";

export const CBC_TERM_LABEL = "2023-0";
export const CBC_TERM_START = "2023-03-01";
export const CBC_TERM_END = "2023-12-20";

type CbcSubject = {
  id: string;
  name: string;
  code: string | null;
  cycle: string | null;
  type: string | null;
};

export type BootstrapStatus = {
  loaded: boolean;
  term: string;
  term_id: string | null;
  approved: number;
  total: number;
  missing: number;
  subjects: CbcSubject[];
};

const getCbcSubjects = async () => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("id,name,code,cycle,type")
    .or("cycle.eq.cbc,type.eq.cbc");

  if (error) {
    throw error;
  }

  return (data ?? []) as CbcSubject[];
};

export const getBootstrapStatus = async (): Promise<BootstrapStatus> => {
  const { data: existingTerm, error: termFindError } = await supabaseAdmin
    .from("terms")
    .select("id,label")
    .eq("label", CBC_TERM_LABEL)
    .maybeSingle();

  if (termFindError) {
    throw termFindError;
  }

  const subjects = await getCbcSubjects();
  if (subjects.length === 0) {
    return {
      loaded: false,
      term: CBC_TERM_LABEL,
      term_id: existingTerm?.id ?? null,
      approved: 0,
      total: 0,
      missing: 0,
      subjects
    };
  }

  const termId = existingTerm?.id ?? null;
  if (!termId) {
    return {
      loaded: false,
      term: CBC_TERM_LABEL,
      term_id: null,
      approved: 0,
      total: subjects.length,
      missing: subjects.length,
      subjects
    };
  }

  const subjectIds = subjects.map((subject) => subject.id);
  const { data: existingEnrollments, error: existingError } = await supabaseAdmin
    .from("enrollments")
    .select("subject_id,status")
    .eq("term_id", termId)
    .in("subject_id", subjectIds);

  if (existingError) {
    throw existingError;
  }

  const approvedCount = (existingEnrollments ?? []).filter(
    (item) => item.status === "aprobado"
  ).length;
  const loaded = approvedCount === subjects.length;

  return {
    loaded,
    term: CBC_TERM_LABEL,
    term_id: termId,
    approved: approvedCount,
    total: subjects.length,
    missing: Math.max(0, subjects.length - approvedCount),
    subjects
  };
};

export const buildBootstrapSummary = ({
  loaded,
  approved,
  total,
  term = CBC_TERM_LABEL
}: {
  loaded: boolean;
  approved: number;
  total: number;
  term?: string;
}) =>
  loaded
    ? `CBC registrado correctamente: ${approved}/${total} aprobadas en ${term}.`
    : `CBC actualizado parcialmente: ${approved}/${total} aprobadas en ${term}.`;

export const bootstrapCbc = async () => {
  const status = await getBootstrapStatus();
  const subjects = status.subjects;

  if (subjects.length === 0) {
    return {
      ok: true,
      created: 0,
      updated: 0,
      skipped: 0,
      term: CBC_TERM_LABEL,
      message: "No se encontraron materias CBC en la base."
    };
  }

  let termId = status.term_id;
  if (!termId) {
    const { data: createdTerm, error: createTermError } = await supabaseAdmin
      .from("terms")
      .insert({
        label: CBC_TERM_LABEL,
        start_date: CBC_TERM_START,
        end_date: CBC_TERM_END,
        is_current: false
      })
      .select("id,label")
      .single();

    if (createTermError) {
      throw createTermError;
    }

    termId = createdTerm.id;
  }

  const subjectIds = subjects.map((subject) => subject.id);
  const { data: existingEnrollments, error: existingError } = await supabaseAdmin
    .from("enrollments")
    .select("subject_id,status")
    .eq("term_id", termId)
    .in("subject_id", subjectIds);

  if (existingError) {
    throw existingError;
  }

  const existingBySubjectId = new Set(
    (existingEnrollments ?? []).map((item) => item.subject_id)
  );
  const missingSubjects = subjects.filter(
    (subject) => !existingBySubjectId.has(subject.id)
  );

  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from("enrollments")
    .update({
      status: "aprobado",
      color: "#1B7C5A",
      notes: "CBC validado como aprobado (2023)."
    })
    .eq("term_id", termId)
    .in("subject_id", subjectIds)
    .neq("status", "aprobado")
    .select("subject_id");

  if (updateError) {
    throw updateError;
  }

  const rows = missingSubjects.map((subject) => ({
    term_id: termId,
    subject_id: subject.id,
    status: "aprobado" as const,
    color: "#1B7C5A",
    notes: "CBC validado como aprobado (2023)."
  }));

  if (rows.length > 0) {
    const { error: insertError } = await supabaseAdmin.from("enrollments").insert(rows);
    if (insertError) {
      throw insertError;
    }
  }

  const fresh = await getBootstrapStatus();

  return {
    ok: true,
    created: rows.length,
    updated: updatedRows?.length ?? 0,
    skipped: Math.max(0, subjects.length - rows.length - (updatedRows?.length ?? 0)),
    loaded: fresh.loaded,
    approved: fresh.approved,
    total: fresh.total,
    term: CBC_TERM_LABEL,
    message: buildBootstrapSummary({
      loaded: fresh.loaded,
      approved: fresh.approved,
      total: fresh.total
    })
  };
};
