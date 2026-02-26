import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import {
  EVENT_WITH_ENROLLMENT_NO_SCHEDULE,
  EVENT_WITH_ENROLLMENT_SCHEDULE,
  isMissingEnrollmentScheduleColumn
} from "@/lib/enrollment-select";
import { supabaseAdmin } from "@/lib/supabase-admin";

const linkSchema = z.object({
  label: z.string().trim().min(1),
  url: z.string().url()
});

const eventPatchSchema = z
  .object({
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
    starts_at: z.string().min(1).optional(),
    ends_at: z.string().nullable().optional(),
    status: z.string().trim().nullable().optional(),
    grade: z.number().min(0).max(10).nullable().optional(),
    attempt: z.number().int().min(1).nullable().optional(),
    links: z.array(linkSchema).nullable().optional()
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
  const parsed = eventPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("events")
    .update(parsed.data)
    .eq("id", params.id)
    .select("id")
    .single();

  if (updateError || !updated?.id) {
    return NextResponse.json({ error: updateError?.message ?? "No se pudo actualizar el evento." }, { status: 500 });
  }

  const firstFetch = await supabaseAdmin
    .from("events")
    .select(EVENT_WITH_ENROLLMENT_SCHEDULE)
    .eq("id", updated.id)
    .single();
  let data: any = firstFetch.data;
  let error: any = firstFetch.error;

  if (error && isMissingEnrollmentScheduleColumn(error)) {
    const retry = await supabaseAdmin
      .from("events")
      .select(EVENT_WITH_ENROLLMENT_NO_SCHEDULE)
      .eq("id", updated.id)
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from("events").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
