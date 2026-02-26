import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import {
  ENROLLMENT_FIELDS_NO_SCHEDULE,
  ENROLLMENT_FIELDS_WITH_SCHEDULE,
  isMissingEnrollmentScheduleColumn
} from "@/lib/enrollment-select";
import { supabaseAdmin } from "@/lib/supabase-admin";

const scheduleSlotSchema = z.object({
  day: z.enum(["lun", "mar", "mie", "jue", "vie", "sab"]),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  location: z.string().trim().max(120).nullable().optional()
});

const enrollmentSchema = z.object({
  term_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  status: z.enum(["cursando", "final_pendiente", "aprobado", "recursar"]),
  color: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  schedule: z.array(scheduleSlotSchema).optional()
});

export async function GET(request: NextRequest) {
  const termId = request.nextUrl.searchParams.get("termId");

  const runQuery = (withSchedule: boolean) => {
    let query = supabaseAdmin
      .from("enrollments")
      .select(withSchedule ? ENROLLMENT_FIELDS_WITH_SCHEDULE : ENROLLMENT_FIELDS_NO_SCHEDULE)
      .order("name", { foreignTable: "subjects", ascending: true });

    if (termId) {
      query = query.eq("term_id", termId);
    }

    return query;
  };

  const firstQuery = await runQuery(true);
  let data: any = firstQuery.data;
  let error: any = firstQuery.error;
  if (error && isMissingEnrollmentScheduleColumn(error)) {
    const retry = await runQuery(false);
    data = retry.data;
    error = retry.error;
  }

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

  const payloadWithSchedule = {
    ...parsed.data,
    schedule: parsed.data.schedule ?? []
  };

  const firstInsert = await supabaseAdmin
    .from("enrollments")
    .insert(payloadWithSchedule)
    .select(ENROLLMENT_FIELDS_WITH_SCHEDULE)
    .single();
  let data: any = firstInsert.data;
  let error: any = firstInsert.error;

  if (error && isMissingEnrollmentScheduleColumn(error)) {
    const { schedule: _ignored, ...payloadWithoutSchedule } = payloadWithSchedule;
    const retry = await supabaseAdmin
      .from("enrollments")
      .insert(payloadWithoutSchedule)
      .select(ENROLLMENT_FIELDS_NO_SCHEDULE)
      .single();
    data = retry.data ? { ...retry.data, schedule: [] } : retry.data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ enrollment: data });
}
