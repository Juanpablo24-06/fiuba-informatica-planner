import { NextResponse } from "next/server";
import { parseJsonBody } from "@/app/api/gpt-actions/_shared";
import { createEvent, eventCreateSchema, listEvents } from "@/lib/admin/events";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const termId = searchParams.get("termId");
  const enrollmentId = searchParams.get("enrollmentId");

  try {
    const events = await listEvents({ termId, enrollmentId });
    return NextResponse.json({ ok: true, termId, enrollmentId, events });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudieron listar los eventos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, eventCreateSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const event = await createEvent(parsed.data);
    return NextResponse.json({ ok: true, event });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo crear el evento." },
      { status: 500 }
    );
  }
}
