import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { demoEnvironment, resolveAppMode } from "../../scripts/app-mode.mjs";

const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "fiuba-mode-"));
  directories.push(directory);
  return directory;
}

describe("application distribution modes", () => {
  it("keeps old installations authenticated and rejects unknown modes", () => {
    const directory = fixture();
    expect(resolveAppMode({}, directory)).toBe("standard");
    expect(() => resolveAppMode({ APP_MODE: "invalid" }, directory)).toThrow();
  });
  it("reads local configuration while giving the deployment environment precedence", () => {
    const directory = fixture();
    writeFileSync(join(directory, ".env"), "APP_MODE=standard\n");
    writeFileSync(join(directory, ".env.local"), "APP_MODE=demo\nSESSION_SECRET=not-exported\n");
    expect(resolveAppMode({}, directory)).toBe("demo");
    expect(resolveAppMode({ APP_MODE: "standard" }, directory)).toBe("standard");
  });
  it("does not pass real service credentials or public build variables to demo", () => {
    expect(demoEnvironment({ Path: "bin", TEMP: "temp", SESSION_SECRET: "secret", VITE_TOKEN: "secret", NEXT_PUBLIC_SUPABASE_URL: "private-db", SUPABASE_SERVICE_ROLE_KEY: "secret", GOOGLE_CALENDAR_ID: "private-calendar", OPENROUTER_API_KEY: "secret" })).toEqual({ Path: "bin", TEMP: "temp" });
  });
});
