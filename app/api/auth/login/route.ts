import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/passwords";
import { sealSession, SESSION_COOKIE_NAME, type Role } from "@/lib/session";

const schema = z.object({
  role: z.enum(["admin", "viewer"]),
  password: z.string().min(1)
});

const getHashForRole = (role: Role) =>
  role === "admin"
    ? process.env.ADMIN_PASSWORD_HASH
    : process.env.VIEWER_PASSWORD_HASH;

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { role, password } = parsed.data;
  const storedHash = getHashForRole(role);
  if (!storedHash) {
    return NextResponse.json(
      { error: "Configuración de contraseña faltante." },
      { status: 500 }
    );
  }

  const valid = verifyPassword(password, storedHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Rol o contraseña incorrecta." },
      { status: 401 }
    );
  }

  const ttlDays = Number(process.env.SESSION_TTL_DAYS ?? 14);
  const { token, exp } = sealSession(role, ttlDays);
  const now = Math.floor(Date.now() / 1000);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: exp - now
  });

  return response;
}
