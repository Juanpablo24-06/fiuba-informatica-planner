import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("global layout source", () => {
  const globalsSource = fs.readFileSync(
    path.join(process.cwd(), "app/globals.css"),
    "utf8"
  );

  it("keeps non-map routes stable while letting the map opt out of the root scrollbar entirely", () => {
    expect(globalsSource).toContain("scrollbar-gutter: stable;");
    expect(globalsSource).toContain('html[data-app-section="mapa"]');
    expect(globalsSource).toContain("overflow-y: hidden;");
    expect(globalsSource).toContain("scrollbar-gutter: auto;");
    expect(globalsSource).not.toContain("overflow-y: scroll;");
  });
});
