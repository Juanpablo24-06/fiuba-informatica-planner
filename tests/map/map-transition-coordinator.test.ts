import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("map transition coordinator source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/layout/map-transition-coordinator.tsx"),
    "utf8"
  );

  it("does not hard-reset pending navigation back to the stale pathname while a route is still loading", () => {
    expect(componentSource).not.toContain("PENDING_NAVIGATION_TIMEOUT_MS");
  });
});
