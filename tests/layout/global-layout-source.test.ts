import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("global layout source", () => {
  const globalsSource = fs.readFileSync(
    path.join(process.cwd(), "app/globals.css"),
    "utf8"
  );

  it("keeps a stable scrollbar gutter without reserving fake space on both sides", () => {
    expect(globalsSource).toContain("scrollbar-gutter: stable;");
    expect(globalsSource).not.toContain("scrollbar-gutter: stable both-edges;");
  });
});
