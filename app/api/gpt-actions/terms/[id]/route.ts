import { academicErrorStatus } from "@/modules/academic/adapters/http-errors";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  jsonError,
  parseJsonBody,
  requireGptActionAuth
} from "@/app/api/gpt-actions/_shared";
import { deleteTerm, termUpdateSchema, updateTerm } from "@/lib/admin/terms";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

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
      { status: academicErrorStatus(error) }
    );
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

  try {
    await deleteTerm(params.id);
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo eliminar el cuatrimestre." },
      { status: academicErrorStatus(error) }
    );
  }
}
