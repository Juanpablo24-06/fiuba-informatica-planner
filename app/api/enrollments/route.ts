import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const enrollmentSchema = z.object({
  term_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  status: z.enum(["cursando", "final_pendiente", "aprobado", "recursar"]),
  color: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional()
});

export async function GET(request: NextRequest) {
  const termId = request.nextUrl.searchParams.get("termId");

  let query = supabaseAdmin
    .from("enrollments")
    .select(
      "id,term_id,subject_id,status,color,notes,subject:subjects(id,code,name,credits,weekly_hours,total_hours,term_suggested,cycle,type,requirements,template),term:terms(id,label,start_date,end_date,is_current)"
    )
    .order("name", { foreignTable: "subjects", ascending: true });

  if (termId) {
    query = query.eq("term_id", termId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ enrollments: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = enrollmentSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ enrollment: data });
}
