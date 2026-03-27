import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("map transition layer source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/layout/map-progress-transition-layer.tsx"),
    "utf8"
  );

  it("renders the cloned bar without registering it as the map-bottom target slot", () => {
    expect(componentSource).toContain("disableSlotRegistration");
  });

  it("waits until the next paint before starting the cloned bar animation", () => {
    expect(componentSource).toContain("requestAnimationFrame");
    expect(componentSource).toContain("data-progress-transition-clone");
  });
});
