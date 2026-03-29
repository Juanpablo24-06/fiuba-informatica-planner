import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("course workspace drawer mobile source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/course-workspace-drawer.tsx"),
    "utf8"
  );

  it("adds mobile-specific sizing and padding without changing the desktop drawer structure", () => {
    expect(componentSource).toContain(
      "h-[90svh] w-[96vw] max-w-6xl overflow-hidden rounded-[1.75rem] border border-border/75 bg-surface p-0 sm:h-[88svh] sm:w-[95vw] sm:rounded-[2.1rem]"
    );
    expect(componentSource).toContain("border-b border-border/60 px-4 py-4 sm:px-7 sm:py-5");
    expect(componentSource).toContain("px-4 py-5 sm:px-7 sm:py-6");
  });

  it("includes an accessible dialog description and a stacked mobile header layout", () => {
    expect(componentSource).toContain("DialogDescription");
    expect(componentSource).toContain("className=\"sr-only\"");
    expect(componentSource).toContain("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between");
  });
});
