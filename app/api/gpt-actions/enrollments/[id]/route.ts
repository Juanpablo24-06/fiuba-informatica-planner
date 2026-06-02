import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  jsonError,
  parseJsonBody,
  requireGptActionAuth
} from "@/app/api/gpt-actions/_shared";
import {
  deleteEnrollment,
  enrollmentUpdateSchema,
  updateEnrollment
} from "@/lib/admin/enrollments";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

  const parsed = await parseJsonBody(request, enrollmentUpdateSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  if (Object.keys(parsed.data).length === 0) {
    return jsonError(400, "No hay cambios para guardar.");
  }

  try {
    const enrollment = await updateEnrollment(params.id, parsed.data);
    return NextResponse.json({ ok: true, enrollment });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo actualizar la cursada." },
      { status }
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
    await deleteEnrollment(params.id);
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo eliminar la cursada." },
      { status: 500 }
    );
  }
}
