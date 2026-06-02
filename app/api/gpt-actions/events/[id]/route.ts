import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  jsonError,
  parseJsonBody,
  requireGptActionAuth
} from "@/app/api/gpt-actions/_shared";
import { deleteEvent, eventUpdateSchema, updateEvent } from "@/lib/admin/events";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

  const parsed = await parseJsonBody(request, eventUpdateSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  if (Object.keys(parsed.data).length === 0) {
    return jsonError(400, "No hay cambios para guardar.");
  }

  try {
    const event = await updateEvent(params.id, parsed.data);
    return NextResponse.json({ ok: true, event });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo actualizar el evento." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

  try {
    await deleteEvent(params.id);
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo eliminar el evento." },
      { status: 500 }
    );
  }
}
