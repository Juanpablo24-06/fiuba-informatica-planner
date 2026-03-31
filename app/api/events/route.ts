import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth";
import {
  createEvent,
  eventCreateSchema,
  listEvents
} from "@/lib/admin/events";

const getErrorStatus = (error: unknown) => {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : 500;
  }
  return 500;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Error desconocido.";

export async function GET(request: NextRequest) {
  const termId = request.nextUrl.searchParams.get("termId");
  const enrollmentId = request.nextUrl.searchParams.get("enrollmentId");

  try {
    const events = await listEvents({ termId, enrollmentId });
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = eventCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  try {
    const event = await createEvent(parsed.data);
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    );
  }
}
