import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth";
import {
  createEnrollment,
  enrollmentCreateSchema,
  listEnrollments
} from "@/lib/admin/enrollments";

const getErrorStatus = (error: unknown) => {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : 500;
  }
  return 500;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Error desconocido.";

export async function GET(request: NextRequest) {
  const termId = request.nextUrl.searchParams.get("termId");

  try {
    const enrollments = await listEnrollments(termId);
    return NextResponse.json({ enrollments });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = enrollmentCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  try {
    const enrollment = await createEnrollment(parsed.data);
    return NextResponse.json({ enrollment });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) }
    );
  }
}
