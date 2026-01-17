import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const subjectSchema = z.object({
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

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select(
      "id,code,name,credits,weekly_hours,total_hours,term_suggested,cycle,type,requirements,template"
    )
    .order("term_suggested", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subjects: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = subjectSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("subjects")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subject: data });
}
