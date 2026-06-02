import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleFromRequest, requireSessionFromRequest } from "@/lib/auth";
import {
  createTerm,
  listTerms,
  termCreateSchema
} from "@/lib/admin/terms";

export async function GET(request: NextRequest) {
  const session = requireSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const terms = await listTerms();
    return NextResponse.json({ terms });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = termCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos. El cuatrimestre debe tener formato YYYY-1 o YYYY-2." },
      { status: 400 }
    );
  }

  try {
    const term = await createTerm(parsed.data);
    if (!term) {
      return NextResponse.json({ error: "No se pudo crear el cuatrimestre." }, { status: 500 });
    }

    return NextResponse.json({ term });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
