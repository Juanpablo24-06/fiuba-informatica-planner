import { NextResponse } from "next/server";
import { sealSession, SESSION_COOKIE_NAME } from "@/lib/session";

const isDemoLoginEnabled = () =>
  process.env.NODE_ENV !== "production" && process.env.DEMO_LOGIN_ENABLED !== "false";

export async function POST() {
  if (!isDemoLoginEnabled()) {
    return NextResponse.json(
      { error: "El modo demo no está habilitado en este entorno." },
      { status: 404 }
    );
  }

  const ttlDays = Number(process.env.SESSION_TTL_DAYS ?? 14);
  const { token, exp } = sealSession("admin", ttlDays);
  const now = Math.floor(Date.now() / 1000);

  const response = NextResponse.json({ ok: true, mode: "demo" });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: exp - now
  });

  return response;
}
