import { NextResponse } from "next/server";
import { parseJsonBody } from "@/app/api/gpt-actions/_shared";
import {
  createSubject,
  listSubjects,
  subjectCreateSchema
} from "@/lib/admin/subjects";

export async function GET(_request: Request) {
  try {
    const subjects = await listSubjects();
    return NextResponse.json({ ok: true, subjects });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudieron listar las materias." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, subjectCreateSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const subject = await createSubject(parsed.data);
    return NextResponse.json({ ok: true, subject });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo crear la materia." },
      { status: 500 }
    );
  }
}
