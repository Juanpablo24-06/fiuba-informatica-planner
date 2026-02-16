import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const unauthorizedResponse = NextResponse.json({ error: "No autorizado." }, { status: 401 });

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return unauthorizedResponse;
    }
  }

  const startedAt = new Date().toISOString();
  const { error, count } = await supabaseAdmin
    .from("terms")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        startedAt,
        error: error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    startedAt,
    touched: "terms",
    totalTerms: count ?? 0
  });
}
