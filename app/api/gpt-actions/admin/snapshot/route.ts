import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  buildAdminSnapshot,
  requireGptActionAuth
} from "@/app/api/gpt-actions/_shared";

export async function GET(request: NextRequest) {
  const unauthorized = requireGptActionAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const snapshot = await buildAdminSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? "No se pudo generar el snapshot admin." },
      { status: 500 }
    );
  }
}
