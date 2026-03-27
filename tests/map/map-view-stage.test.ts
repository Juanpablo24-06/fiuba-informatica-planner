import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("map view stage source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/map/map-view-stage.tsx"),
    "utf8"
  );

  it("keeps an explicit hidden shell for the map while the loader is active", () => {
    expect(componentSource).toContain("data-map-view-shell");
    expect(componentSource).toContain("aria-hidden={!ready}");
    expect(componentSource).toContain("invisible opacity-0");
    expect(componentSource).toContain("visible opacity-100");
  });
});
