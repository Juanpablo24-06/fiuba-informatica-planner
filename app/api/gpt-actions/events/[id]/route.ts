import { NextResponse } from "next/server";
import { jsonError, parseJsonBody } from "@/app/api/gpt-actions/_shared";
import { deleteEvent, eventUpdateSchema, updateEvent } from "@/lib/admin/events";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
  _request: Request,
  { params }: { params: { id: string } }
) {
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
