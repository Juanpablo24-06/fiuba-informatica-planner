import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const HISTORIC_TERM_LABEL_PATTERN = /^\d{4}-(0|1|2)$/i;

const termPatchSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(3)
      .regex(HISTORIC_TERM_LABEL_PATTERN, "Formato inválido")
      .optional(),
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
    return NextResponse.json(
      {
        error:
          "Datos inválidos. Formato permitido: YYYY-1 o YYYY-2 (y YYYY-0 solo para histórico CBC)."
      },
      { status: 400 }
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
  }

  if (parsed.data.is_current) {
    const { error: clearError } = await supabaseAdmin
      .from("terms")
      .update({ is_current: false })
      .neq("id", params.id);
    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("terms")
    .update(parsed.data)
    .eq("id", params.id)
    .select("id,label,start_date,end_date,is_current");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const term = Array.isArray(data) ? data[0] ?? null : data ?? null;
  if (!term) {
    return NextResponse.json({ error: "No se encontró el cuatrimestre a actualizar." }, { status: 404 });
  }

  return NextResponse.json({ term });
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
