import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("app shell scrollbar compensation source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/layout/app-shell.tsx"),
    "utf8"
  );

  it("marks the main shell so routes without a root scrollbar can keep the layout width stable", () => {
    expect(componentSource).toContain("data-scrollbar-compensate");
  });
});
