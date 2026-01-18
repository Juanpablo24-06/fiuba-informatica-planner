import crypto from "crypto";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

export { SESSION_COOKIE_NAME };

export type Role = "admin" | "viewer";

export type SessionPayload = {
  role: Role;
  exp: number;
};

const getSecretKey = (secret: string) =>
  crypto.createHash("sha256").update(secret).digest();

const base64urlEncode = (buffer: Buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const base64urlDecode = (value: string) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + padding;
  return Buffer.from(base64, "base64");
};

export const sealSession = (role: Role, ttlDays = 14) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required");
  }
  const exp = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60;
  const payload: SessionPayload = { role, exp };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getSecretKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  const token = base64urlEncode(Buffer.concat([iv, encrypted, tag]));
  return { token, exp };
};

export const unsealSession = (token: string): SessionPayload | null => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required");
  }
  try {
    const raw = base64urlDecode(token);
    if (raw.length < 12 + 16) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(raw.length - 16);
    const ciphertext = raw.subarray(12, raw.length - 16);
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getSecretKey(secret),
      iv
    );
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]).toString("utf8");
    const payload = JSON.parse(decrypted) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
};
