import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const CBC_TERM_LABEL = "2023-0";
const CBC_TERM_START = "2023-03-01";
const CBC_TERM_END = "2023-12-20";

const getCbcSubjects = async () => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("id,name,code,cycle,type")
    .or("cycle.eq.cbc,type.eq.cbc");

  if (error) throw error;
  return data ?? [];
};

const getBootstrapStatus = async () => {
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

export async function GET(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const status = await getBootstrapStatus();
    return NextResponse.json({
      ok: true,
      loaded: status.loaded,
      term: status.term,
      approved: status.approved,
      total: status.total,
      missing: status.missing
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Error desconocido." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const status = await getBootstrapStatus();
    const subjects = status.subjects;

    if (subjects.length === 0) {
      return NextResponse.json({
        ok: true,
        created: 0,
        updated: 0,
        skipped: 0,
        term: CBC_TERM_LABEL,
        message: "No se encontraron materias CBC en la base."
      });
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
        return NextResponse.json({ error: createTermError.message }, { status: 500 });
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
      return NextResponse.json({ error: existingError.message }, { status: 500 });
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
      return NextResponse.json({ error: updateError.message }, { status: 500 });
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
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const fresh = await getBootstrapStatus();

    return NextResponse.json({
      ok: true,
      created: rows.length,
      updated: updatedRows?.length ?? 0,
      skipped: Math.max(0, subjects.length - rows.length - (updatedRows?.length ?? 0)),
      loaded: fresh.loaded,
      approved: fresh.approved,
      total: fresh.total,
      term: CBC_TERM_LABEL,
      message: fresh.loaded
        ? `CBC registrado correctamente: ${fresh.approved}/${fresh.total} aprobadas en ${CBC_TERM_LABEL}.`
        : `CBC actualizado parcialmente: ${fresh.approved}/${fresh.total} aprobadas en ${CBC_TERM_LABEL}.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Error desconocido." }, { status: 500 });
  }
}
