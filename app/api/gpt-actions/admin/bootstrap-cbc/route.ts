import { NextResponse } from "next/server";
import { bootstrapCbc, getBootstrapStatus } from "@/lib/admin/bootstrap-cbc";

export async function GET() {
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

export async function POST() {
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
