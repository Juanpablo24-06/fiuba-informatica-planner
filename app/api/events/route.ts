import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const linkSchema = z.object({
  label: z.string().trim().min(1),
  url: z.string().url()
});

const eventSchema = z.object({
  enrollment_id: z.string().uuid(),
  type: z.enum([
    "parcial",
    "recuperatorio",
    "tp",
    "defensa",
    "final",
    "clase",
    "otro"
  ]),
  title: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  starts_at: z.string().min(1),
  ends_at: z.string().nullable().optional(),
  status: z.string().trim().nullable().optional(),
  grade: z.number().min(0).max(10).nullable().optional(),
  attempt: z.number().int().min(1).nullable().optional(),
  links: z.array(linkSchema).nullable().optional()
});

export async function GET(request: NextRequest) {
  const termId = request.nextUrl.searchParams.get("termId");
  const enrollmentId = request.nextUrl.searchParams.get("enrollmentId");

  let query = supabaseAdmin
    .from("events")
    .select(
      "id,enrollment_id,type,title,description,starts_at,ends_at,status,grade,attempt,links,enrollment:enrollments(id,term_id,subject_id,status,color,notes,subject:subjects(id,code,name,credits,weekly_hours,total_hours,term_suggested,cycle,type,requirements,template))"
    )
    .order("starts_at", { ascending: true });

  if (termId) {
    query = query.eq("enrollment.term_id", termId);
  }
  if (enrollmentId) {
    query = query.eq("enrollment_id", enrollmentId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert(parsed.data)
    .select(
      "id,enrollment_id,type,title,description,starts_at,ends_at,status,grade,attempt,links,enrollment:enrollments(id,term_id,subject_id,status,color,notes,subject:subjects(id,code,name,credits,weekly_hours,total_hours,term_suggested,cycle,type,requirements,template))"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
