import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseJsonBody, requireGptActionAuth } from "@/app/api/gpt-actions/_shared";
import { createTerm, listTerms, termCreateSchema } from "@/lib/admin/terms";

export async function GET(request: NextRequest) {
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const terms = await listTerms();
    return NextResponse.json({ ok: true, terms });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudieron listar los cuatrimestres." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

  const parsed = await parseJsonBody(request, termCreateSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const term = await createTerm(parsed.data);
    return NextResponse.json({ ok: true, term });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo crear el cuatrimestre." },
      { status: 500 }
    );
  }
}
