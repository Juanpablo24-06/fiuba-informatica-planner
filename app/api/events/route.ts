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

  const runQuery = (withSchedule: boolean) => {
    let query = supabaseAdmin
      .from("events")
      .select(withSchedule ? EVENT_WITH_ENROLLMENT_SCHEDULE : EVENT_WITH_ENROLLMENT_NO_SCHEDULE)
      .order("starts_at", { ascending: true });

    if (termId) {
      query = query.eq("enrollment.term_id", termId);
    }
    if (enrollmentId) {
      query = query.eq("enrollment_id", enrollmentId);
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

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("events")
    .insert(parsed.data)
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    return NextResponse.json({ error: insertError?.message ?? "No se pudo crear el evento." }, { status: 500 });
  }

  const firstFetch = await supabaseAdmin
    .from("events")
    .select(EVENT_WITH_ENROLLMENT_SCHEDULE)
    .eq("id", inserted.id)
    .single();
  let data: any = firstFetch.data;
  let error: any = firstFetch.error;

  if (error && isMissingEnrollmentScheduleColumn(error)) {
    const retry = await supabaseAdmin
      .from("events")
      .select(EVENT_WITH_ENROLLMENT_NO_SCHEDULE)
      .eq("id", inserted.id)
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
