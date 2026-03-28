import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("map transition coordinator source", () => {
  const coordinatorSource = fs.readFileSync(
    path.join(process.cwd(), "components/layout/map-transition-coordinator.tsx"),
    "utf8"
  );

  it("publishes the effective section on the root element so global scroll behavior can follow the current route", () => {
    expect(coordinatorSource).toContain("root.dataset.appSection");
  });
});
