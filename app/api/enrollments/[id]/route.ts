import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const enrollmentPatchSchema = z
  .object({
    status: z.enum(["cursando", "final_pendiente", "aprobado", "recursar"]).optional(),
    color: z.string().trim().nullable().optional(),
    notes: z.string().trim().nullable().optional()
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
  const parsed = enrollmentPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ enrollment: data });
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
    .from("enrollments")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
