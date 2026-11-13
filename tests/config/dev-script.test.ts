import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dev script cache hygiene", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")
  ) as {
    scripts?: Record<string, string>;
  };

  it("clears the unstable next webpack cache before starting dev", () => {
    expect(packageJson.scripts?.dev).toBe("node scripts/app-mode.mjs dev");
    const runner = fs.readFileSync(path.join(process.cwd(), "scripts/app-mode.mjs"), "utf8");
    expect(runner).toContain('if (!demo && command === "dev")');
    expect(runner).toContain("clean-next-webpack-cache.mjs");
  });
});
