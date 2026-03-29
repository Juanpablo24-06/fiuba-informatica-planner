import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("global layout source", () => {
  const globalsSource = fs.readFileSync(
    path.join(process.cwd(), "app/globals.css"),
    "utf8"
  );

  it("defines a shared scrollbar compensation variable instead of reserving a visible root gutter", () => {
    expect(globalsSource).toContain("--layout-scrollbar-compensation");
    expect(globalsSource).toContain("body[data-scroll-locked]");
    expect(globalsSource).not.toContain("scrollbar-gutter: stable;");
  });

  it("still disables root scrolling for the map section without relying on a permanent gutter reservation", () => {
    expect(globalsSource).toContain('html[data-app-section="mapa"]');
    expect(globalsSource).toContain("overflow-y: hidden;");
  });
});
