import { describe, expect, it } from "vitest";
import {
  CBC_TERM_LABEL,
  buildBootstrapSummary
} from "@/lib/admin/bootstrap-cbc";

describe("admin bootstrap cbc service contract", () => {
  it("uses the historic CBC term label", () => {
    expect(CBC_TERM_LABEL).toBe("2023-0");
  });

  it("builds a success summary from status counts", () => {
    expect(
      buildBootstrapSummary({
        loaded: true,
        approved: 6,
        total: 6
      })
    ).toContain("2023-0");
  });
});
