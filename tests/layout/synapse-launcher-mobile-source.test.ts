import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("synapse launcher mobile source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/layout/synapse-launcher.tsx"),
    "utf8"
  );

  it("uses the compact launcher footprint by default on small screens and expands only from the small breakpoint upward", () => {
    expect(componentSource).toContain("sm:mx-auto sm:w-[14.5rem]");
    expect(componentSource).toContain("sm:justify-between sm:gap-1.5 sm:rounded-2xl sm:px-2.5");
  });
});
