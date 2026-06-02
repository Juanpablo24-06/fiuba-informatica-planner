import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

type ExternalAdminAuthOptions = {
  tokenEnvNames: string[];
};

const SHARED_TOKEN_ENV = "EXTERNAL_ADMIN_BEARER_TOKEN";

const getBearerToken = (request: NextRequest) => {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
};

const safeEqual = (provided: string, expected: string) => {
  const providedHash = crypto.createHash("sha256").update(provided).digest();
  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(providedHash, expectedHash);
};

const getConfiguredTokens = (tokenEnvNames: string[]) =>
  [SHARED_TOKEN_ENV, ...tokenEnvNames]
    .map((name) => process.env[name]?.trim())
    .filter((token): token is string => Boolean(token));

export const isExternalAdminRequestAuthorized = (
  request: NextRequest,
  { tokenEnvNames }: ExternalAdminAuthOptions
) => {
  const session = getSessionFromRequest(request);
  if (session?.role === "admin") {
    return true;
  }

  const bearerToken = getBearerToken(request);
  if (!bearerToken) {
    return false;
  }

  return getConfiguredTokens(tokenEnvNames).some((token) =>
    safeEqual(bearerToken, token)
  );
};

export const requireExternalAdminRequest = (
  request: NextRequest,
  options: ExternalAdminAuthOptions
) =>
  isExternalAdminRequestAuthorized(request, options)
    ? null
    : NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
