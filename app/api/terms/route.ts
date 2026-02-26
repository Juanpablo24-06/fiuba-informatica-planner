import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const termSchema = z.object({
  label: z.string().trim().min(3),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_current: z.boolean().optional()
});

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("terms")
    .select("id,label,start_date,end_date,is_current")
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("label", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ terms: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = termSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  if (parsed.data.is_current) {
    await supabaseAdmin
      .from("terms")
      .update({ is_current: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data, error } = await supabaseAdmin
    .from("terms")
    .insert(parsed.data)
    .select("id,label,start_date,end_date,is_current");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const term = Array.isArray(data) ? data[0] ?? null : data ?? null;
  if (!term) {
    return NextResponse.json({ error: "No se pudo crear el cuatrimestre." }, { status: 500 });
  }

  return NextResponse.json({ term });
}
