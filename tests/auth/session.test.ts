// @vitest-environment node
import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sealSession, unsealSession } from "@/lib/session";
import { unsealSessionEdge } from "@/lib/session-edge";

const secret = "local-session-regression-test";
const tokenFor = (payload: unknown) => {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash("sha256").update(secret).digest();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]);
  return Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString("base64url");
};

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", secret);
  vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("session validation in Node and Edge", () => {
  it.each(["admin", "viewer"] as const)("accepts a valid %s session", async (role) => {
    const { token, exp } = sealSession(role);
    expect(unsealSession(token)).toEqual({ role, exp });
    await expect(unsealSessionEdge(token, secret)).resolves.toEqual({ role, exp });
  });

  it.each([
    null, {}, { role: "owner", exp: 1_800_000_100 },
    { role: "admin", exp: "1800000100" }, { role: "admin", exp: 1_800_000_100.5 },
    { role: "admin", exp: 1_800_000_000 }, { role: "admin", exp: 1_799_999_999 }
  ])("rejects expired or malformed encrypted payloads: %j", async (payload) => {
    const token = tokenFor(payload);
    expect(unsealSession(token)).toBeNull();
    await expect(unsealSessionEdge(token, secret)).resolves.toBeNull();
  });

  it("rejects invalid ciphertext", async () => {
    expect(unsealSession("not-a-token")).toBeNull();
    await expect(unsealSessionEdge("not-a-token", secret)).resolves.toBeNull();
  });
});
