import { NextResponse } from "next/server";
import { jsonError, parseJsonBody } from "@/app/api/gpt-actions/_shared";
import { deleteTerm, termUpdateSchema, updateTerm } from "@/lib/admin/terms";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const parsed = await parseJsonBody(request, termUpdateSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  if (Object.keys(parsed.data).length === 0) {
    return jsonError(400, "No hay cambios para guardar.");
  }

  try {
    const term = await updateTerm(params.id, parsed.data);
    if (!term) {
      return jsonError(404, "No se encontró el cuatrimestre.");
    }

    return NextResponse.json({ ok: true, term });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo actualizar el cuatrimestre." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteTerm(params.id);
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo eliminar el cuatrimestre." },
      { status: 500 }
    );
  }
}
