import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("map page source", () => {
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), "app/(app)/mapa/page.tsx"),
    "utf8"
  );

  it("anchors the map shell to the viewport instead of stretching it with width and negative margin hacks", () => {
    expect(pageSource).toContain("fixed inset-0");
    expect(pageSource).not.toContain("marginRight: \"calc(var(--root-scrollbar-offset, 0px) * -1)\"");
    expect(pageSource).not.toContain("width: \"calc(100% + var(--root-scrollbar-offset, 0px))\"");
  });
});
