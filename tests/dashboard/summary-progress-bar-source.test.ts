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
});
