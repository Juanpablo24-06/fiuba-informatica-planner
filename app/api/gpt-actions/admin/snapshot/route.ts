import { NextResponse } from "next/server";
import { buildAdminSnapshot } from "@/app/api/gpt-actions/_shared";

export async function GET() {
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
