import { describe, expect, it } from "vitest";
import { getSummarySegmentFillWidth } from "@/lib/dashboard/summary-progress";

describe("getSummarySegmentFillWidth", () => {
  it("slightly overdraws full segments so the trailing edge does not flicker", () => {
    expect(getSummarySegmentFillWidth(100)).toBe("calc(100% + 1px)");
  });

  it("keeps partial segments mapped to their exact percentage", () => {
    expect(getSummarySegmentFillWidth(62)).toBe("62%");
  });
});
