import { NextResponse } from "next/server";
import { parseJsonBody } from "@/app/api/gpt-actions/_shared";
import {
  createEnrollment,
  enrollmentCreateSchema,
  listEnrollments
} from "@/lib/admin/enrollments";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const termId = searchParams.get("termId");

  try {
    const enrollments = await listEnrollments(termId);
    return NextResponse.json({ ok: true, termId, enrollments });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudieron listar las cursadas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, enrollmentCreateSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const enrollment = await createEnrollment(parsed.data);
    return NextResponse.json({ ok: true, enrollment });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo crear la cursada." },
      { status: 500 }
    );
  }
}
