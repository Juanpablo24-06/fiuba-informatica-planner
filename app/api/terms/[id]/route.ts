import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const termPatchSchema = z
  .object({
    label: z.string().trim().min(3).optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    is_current: z.boolean().optional()
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
  const parsed = termPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  if (parsed.data.is_current) {
    await supabaseAdmin
      .from("terms")
      .update({ is_current: false })
      .neq("id", params.id);
  }

  const { data, error } = await supabaseAdmin
    .from("terms")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ term: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from("terms").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
