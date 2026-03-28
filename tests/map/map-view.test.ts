import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("map view interactive clamp", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/map/map-view.tsx"),
    "utf8"
  );

  it("adds a relaxed top inset for user-driven pan and zoom gestures", () => {
    expect(componentSource).toContain("export const getRelaxedInteractiveTopInset");
    expect(componentSource).toContain(
      "const relaxedInteractiveTopInset = getRelaxedInteractiveTopInset(safeTopInset, isDesktop);"
    );
    expect(componentSource).toContain("setInteractiveTransformSafe");
    expect(componentSource).toContain("safeTopInset - (isDesktop ? 24 : 16)");
  });
});
