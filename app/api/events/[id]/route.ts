import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth";
import {
  deleteEvent,
  eventUpdateSchema,
  updateEvent
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

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = eventUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  try {
    const event = await updateEvent(params.id, parsed.data);
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    );
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    await deleteEvent(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    );
  }
}
