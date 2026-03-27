import { describe, expect, it } from "vitest";
import {
  getPrimaryEventLinkDraft,
  mergeEventLinks
} from "@/lib/dashboard/event-links";

describe("event link helpers", () => {
  it("reads the first event link for editing without touching the rest", () => {
    expect(
      getPrimaryEventLinkDraft([
        { label: "Material 1", url: "https://example.com/a" },
        { label: "Material 2", url: "https://example.com/b" }
      ])
    ).toEqual({
      label: "Material 1",
      url: "https://example.com/a"
    });
  });

  it("preserves secondary links when updating the primary link", () => {
    expect(
      mergeEventLinks({
        existingLinks: [
          { label: "Material 1", url: "https://example.com/a" },
          { label: "Material 2", url: "https://example.com/b" }
        ],
        label: "Material actualizado",
        url: "  https://example.com/nuevo  "
      })
    ).toEqual([
      { label: "Material actualizado", url: "https://example.com/nuevo" },
      { label: "Material 2", url: "https://example.com/b" }
    ]);
  });

  it("keeps secondary links when the primary one is cleared", () => {
    expect(
      mergeEventLinks({
        existingLinks: [
          { label: "Material 1", url: "https://example.com/a" },
          { label: "Material 2", url: "https://example.com/b" }
        ],
        label: "",
        url: "   "
      })
    ).toEqual([{ label: "Material 2", url: "https://example.com/b" }]);
  });
});
