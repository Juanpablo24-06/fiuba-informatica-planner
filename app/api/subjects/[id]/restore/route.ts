import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth";
import { restoreSubject } from "@/lib/admin/subjects";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await props.params;
  try {
    const subject = await restoreSubject(id);
    if (!subject) {
      return NextResponse.json(
        { error: "No se encontró una materia archivada con ese id." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, subject });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo restaurar la materia." },
      { status: 500 }
    );
  }
}
