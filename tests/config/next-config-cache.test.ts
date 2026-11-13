import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Next.js 16 build configuration", () => {
  const nextConfigSource = fs.readFileSync(
    path.join(process.cwd(), "next.config.js"),
    "utf8"
  );

  it("does not force the legacy webpack compiler over stable Turbopack", () => {
    expect(nextConfigSource).not.toContain("webpack:");
    expect(nextConfigSource).toContain("optimizePackageImports");
  });
});
