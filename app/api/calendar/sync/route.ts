import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth";
import { refreshCalendarCache } from "@/lib/google-calendar";

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  refreshCalendarCache();
  return NextResponse.json({ ok: true });
}
