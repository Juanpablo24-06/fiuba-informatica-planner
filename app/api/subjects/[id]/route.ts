import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth";
import {
  deleteSubject,
  subjectUpdateSchema,
  updateSubject
} from "@/lib/admin/subjects";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = subjectUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  try {
    const subject = await updateSubject(params.id, parsed.data);
    return NextResponse.json({ subject });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    await deleteSubject(params.id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
