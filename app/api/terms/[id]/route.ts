import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth";
import {
  deleteTerm,
  termUpdateSchema,
  updateTerm
} from "@/lib/admin/terms";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = termUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Datos inválidos. Formato permitido: YYYY-1 o YYYY-2 (y YYYY-0 solo para histórico CBC)."
      },
      { status: 400 }
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
  }

  try {
    const term = await updateTerm(params.id, parsed.data);
    if (!term) {
      return NextResponse.json(
        { error: "No se encontró el cuatrimestre a actualizar." },
        { status: 404 }
      );
    }

    return NextResponse.json({ term });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    await deleteTerm(params.id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
