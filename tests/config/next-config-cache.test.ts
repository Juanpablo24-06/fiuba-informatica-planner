import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("next dev cache configuration", () => {
  const nextConfigSource = fs.readFileSync(
    path.join(process.cwd(), "next.config.js"),
    "utf8"
  );

  it("switches development webpack caching away from the flaky filesystem pack cache", () => {
    expect(nextConfigSource).toContain("config.cache = { type: \"memory\" }");
    expect(nextConfigSource).toContain("if (dev)");
  });
});
