import { describe, expect, it } from "vitest";
import {
  termCreateSchema,
  termUpdateSchema,
  clearCurrentTermsUpdate
} from "@/lib/admin/terms";

describe("admin terms service contract", () => {
  it("accepts create payloads only for regular terms", () => {
    expect(
      termCreateSchema.parse({
        label: "2026-1",
        start_date: "2026-03-10",
        end_date: "2026-07-15",
        is_current: true
      })
    ).toMatchObject({ label: "2026-1", is_current: true });

    expect(() =>
      termCreateSchema.parse({
        label: "2026-0"
      })
    ).toThrow();
  });

  it("accepts update payloads for historic terms and exposes the clear-current patch", () => {
    expect(
      termUpdateSchema.parse({
        label: "2023-0",
        is_current: true
      })
    ).toMatchObject({ label: "2023-0", is_current: true });

    expect(clearCurrentTermsUpdate).toEqual({ is_current: false });
  });

  it.each(["not-a-date", "2026-02-30", "2026-13-01"])("rejects an invalid date: %s", (start_date) => {
    expect(termCreateSchema.safeParse({ label: "2026-1", start_date }).success).toBe(false);
    expect(termUpdateSchema.safeParse({ end_date: start_date }).success).toBe(false);
  });

  it("rejects reversed ranges while allowing omitted or cleared dates", () => {
    expect(termCreateSchema.safeParse({
      label: "2026-1", start_date: "2026-07-15", end_date: "2026-03-10"
    }).success).toBe(false);
    expect(termUpdateSchema.parse({ start_date: null })).toEqual({ start_date: null });
  });
});
