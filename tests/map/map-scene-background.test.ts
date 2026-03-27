import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("map scene background source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/map/map-scene-background.tsx"),
    "utf8"
  );

  it("keeps the persistent map backdrop free of loader node diagrams", () => {
    expect(componentSource).not.toContain("MAP_LOADING_FLOW_NODES");
    expect(componentSource).not.toContain("MAP_LOADING_FLOW_PATHS");
    expect(componentSource).not.toContain("data-testid=\"map-loader-node\"");
    expect(componentSource).not.toContain("animate-map-loader-line");
  });
});
