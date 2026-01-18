import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  return NextResponse.json(
    {
      error: "Sync provider no configurado.",
      instructions: "Configura OAuth de Google Calendar y webhooks antes de usarlo."
    },
    { status: 501 }
  );
}
