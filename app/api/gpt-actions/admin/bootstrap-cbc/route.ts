import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireGptActionAuth } from "@/app/api/gpt-actions/_shared";
import { bootstrapCbc, getBootstrapStatus } from "@/lib/admin/bootstrap-cbc";

export async function GET(request: NextRequest) {
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const status = await getBootstrapStatus();
    return NextResponse.json({ ok: true, status });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo consultar el estado CBC." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await bootstrapCbc();
    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo ejecutar el bootstrap CBC." },
      { status: 500 }
    );
  }
}
