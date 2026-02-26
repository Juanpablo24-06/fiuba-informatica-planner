import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import { isMissingEnrollmentScheduleColumn } from "@/lib/enrollment-select";
import { supabaseAdmin } from "@/lib/supabase-admin";

const scheduleSlotSchema = z.object({
  day: z.enum(["lun", "mar", "mie", "jue", "vie", "sab"]),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  location: z.string().trim().max(120).nullable().optional()
});

const enrollmentPatchSchema = z
  .object({
    status: z.enum(["cursando", "final_pendiente", "aprobado", "recursar"]).optional(),
    color: z.string().trim().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    schedule: z.array(scheduleSlotSchema).optional()
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

  const patch = parsed.data;
  let { data, error } = await supabaseAdmin
    .from("enrollments")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (error && isMissingEnrollmentScheduleColumn(error)) {
    const { schedule: _ignored, ...patchWithoutSchedule } = patch;
    if (Object.keys(patchWithoutSchedule).length === 0) {
      return NextResponse.json(
        {
          error:
            "La base local todavía no tiene la columna schedule. Ejecutá la migración 003_enrollment_schedule.sql."
        },
        { status: 409 }
      );
    }

    const retry = await supabaseAdmin
      .from("enrollments")
      .update(patchWithoutSchedule)
      .eq("id", params.id)
      .select()
      .single();
    data = retry.data ? { ...retry.data, schedule: [] } : retry.data;
    error = retry.error;
  }

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
