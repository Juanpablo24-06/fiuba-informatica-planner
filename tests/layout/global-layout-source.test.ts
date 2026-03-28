import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("global layout source", () => {
  const globalsSource = fs.readFileSync(
    path.join(process.cwd(), "app/globals.css"),
    "utf8"
  );

  it("stabilizes vertical scroll without reserving invisible gutters that shrink the map canvas", () => {
    expect(globalsSource).toContain("overflow-y: scroll;");
    expect(globalsSource).not.toContain("scrollbar-gutter:");
  });
});
