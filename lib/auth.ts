import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, type Role, unsealSession } from "@/lib/session";

export const getSession = async () => {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return token ? unsealSession(token) : null;
};

export const getSessionFromRequest = (request: NextRequest) => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? unsealSession(token) : null;
};

export const requireRoleFromRequest = (
  request: NextRequest,
  role: Role
) => {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== role) return null;
  return session;
};

export const requireSessionFromRequest = (request: NextRequest) =>
  getSessionFromRequest(request);
