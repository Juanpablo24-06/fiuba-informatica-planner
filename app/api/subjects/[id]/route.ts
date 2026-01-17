import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const subjectPatchSchema = z
  .object({
    code: z.string().trim().min(1).max(32).nullable().optional(),
    name: z.string().trim().min(1).optional(),
    credits: z.number().int().min(0).nullable().optional(),
    weekly_hours: z.number().int().min(0).nullable().optional(),
    total_hours: z.number().int().min(0).nullable().optional(),
    term_suggested: z.number().int().min(1).max(10).nullable().optional(),
    cycle: z.string().trim().nullable().optional(),
    type: z.string().trim().nullable().optional(),
    requirements: z.array(z.string().trim()).nullable().optional(),
    template: z.record(z.any()).nullable().optional()
  })
  .partial();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = subjectPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("subjects")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subject: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("subjects")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
