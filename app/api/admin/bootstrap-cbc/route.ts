import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth";
import { bootstrapCbc, getBootstrapStatus } from "@/lib/admin/bootstrap-cbc";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Error desconocido.";

export async function GET(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const status = await getBootstrapStatus();
    return NextResponse.json({
      ok: true,
      loaded: status.loaded,
      term: status.term,
      approved: status.approved,
      total: status.total,
      missing: status.missing
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const result = await bootstrapCbc();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
