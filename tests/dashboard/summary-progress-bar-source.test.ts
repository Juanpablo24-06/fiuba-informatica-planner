import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("summary progress bar source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/summary-progress-bar.tsx"),
    "utf8"
  );

  it("allows transition clones to opt out of progress slot registration", () => {
    expect(componentSource).toContain("disableSlotRegistration");
    expect(componentSource).toContain(
      "data-progress-slot={disableSlotRegistration ? undefined : mode}"
    );
  });

  it("keeps the progress stripes as a clipped overlay so the right edge does not shimmer", () => {
    expect(componentSource).toContain("segment.stripeColor");
    expect(componentSource).toContain("mix-blend-screen");
    expect(componentSource).toContain('fillPct > 0 ? (');
    expect(componentSource).toContain(
      'backgroundImage: `repeating-linear-gradient(-45deg, ${segment.stripeColor} 0 8px, transparent 8px 16px)`'
    );
  });

  it("uses the fill-width helper so fully completed segments overdraw the trailing seam", () => {
    expect(componentSource).toContain("getSummarySegmentFillWidth");
  });
});
