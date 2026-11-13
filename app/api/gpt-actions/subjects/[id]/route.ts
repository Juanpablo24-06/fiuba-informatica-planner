import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  jsonError,
  parseJsonBody,
  requireGptActionAuth
} from "@/app/api/gpt-actions/_shared";
import {
  deleteSubject,
  restoreSubject,
  subjectUpdateSchema,
  updateSubject
} from "@/lib/admin/subjects";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

  const parsed = await parseJsonBody(request, subjectUpdateSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  if (Object.keys(parsed.data).length === 0) {
    return jsonError(400, "No hay cambios para guardar.");
  }

  try {
    const subject = await updateSubject(params.id, parsed.data);
    return NextResponse.json({ ok: true, subject });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo actualizar la materia." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

  try {
    await deleteSubject(params.id);
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo eliminar la materia." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const subject = await restoreSubject(params.id);
    if (!subject) {
      return jsonError(404, "No se encontró una materia archivada con ese id.");
    }
    return NextResponse.json({ ok: true, subject, restored: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo restaurar la materia." },
      { status: 500 }
    );
  }
}
