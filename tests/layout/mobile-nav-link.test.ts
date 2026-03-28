import { describe, expect, it } from "vitest";
import { resolveMobileSectionHref } from "@/lib/navigation";

describe("resolveMobileSectionHref", () => {
  it("keeps the current agenda subsection on mobile when the user is already inside it", () => {
    expect(
      resolveMobileSectionHref({
        href: "/agenda",
        pathname: "/agenda/evaluaciones",
        subItemHrefs: ["/agenda/semana", "/agenda/evaluaciones"]
      })
    ).toBe("/agenda/evaluaciones");
  });

  it("falls back to the first subsection when the section root has no active child yet", () => {
    expect(
      resolveMobileSectionHref({
        href: "/agenda",
        pathname: "/agenda",
        subItemHrefs: ["/agenda/semana", "/agenda/evaluaciones"]
      })
    ).toBe("/agenda/semana");
  });

  it("returns the section href unchanged when there are no mobile subsections", () => {
    expect(
      resolveMobileSectionHref({
        href: "/mapa",
        pathname: "/mapa"
      })
    ).toBe("/mapa");
  });
});
