import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import { calendarIntelligenceService } from "@/modules/calendar/intelligence-server";
import { hasAnyAIProviderConfigured } from "@/lib/ai/provider";

const payloadSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime()
});

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
  }

  if (!hasAnyAIProviderConfigured()) {
    return NextResponse.json(
      {
        error: "AI no configurada.",
        instructions:
          "Define OPENROUTER_API_KEY o NVIDIA_API_KEY en .env.local y reinicia el server."
      },
      { status: 501 }
    );
  }

  try {
    return NextResponse.json(await calendarIntelligenceService.enrich(parsed.data));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Falló la operación", ...(error?.needs_review ? { needs_review: true } : {}) }, { status: error?.status ?? 500 });
  }
}
