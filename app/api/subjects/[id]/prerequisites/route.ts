import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleFromRequest, requireSessionFromRequest } from "@/lib/auth";
import {
  getSubjectRelations,
  replaceSubjectPrerequisites,
  replaceSubjectRelations,
  subjectPrerequisitesSchema
} from "@/lib/admin/subjects";

const relationErrorStatus = (error: any) =>
  ["P0002", "23503", "23514"].includes(error?.code) ? 400 : 500;

const relationErrorMessage = (error: any) =>
  error?.message ?? "No se pudieron actualizar las relaciones de la materia.";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const session = requireSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  try {
    const { id } = await props.params;
    const relations = await getSubjectRelations(id);
    return NextResponse.json(relations);
  } catch (error: any) {
    return NextResponse.json(
      { error: relationErrorMessage(error) },
      { status: relationErrorStatus(error) }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const payload = await request.json().catch(() => null);
  const parsed = subjectPrerequisitesSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const { id } = await props.params;
  try {
    const relations = parsed.data.unlockIds === undefined
      ? await replaceSubjectPrerequisites(id, parsed.data.prerequisiteIds)
      : await replaceSubjectRelations({
          subjectId: id,
          prerequisiteIds: parsed.data.prerequisiteIds,
          unlockIds: parsed.data.unlockIds
        });
    return NextResponse.json(relations);
  } catch (error: any) {
    return NextResponse.json(
      { error: relationErrorMessage(error) },
      { status: relationErrorStatus(error) }
    );
  }
}
