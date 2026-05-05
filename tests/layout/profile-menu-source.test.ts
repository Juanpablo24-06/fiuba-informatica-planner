import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("profile menu source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/layout/profile-menu.tsx"),
    "utf8"
  );

  it("shows graphite as the primary palette choice and keeps the density selector out of the menu", () => {
    expect(componentSource).toContain('id: "grafito"');
    expect(componentSource).toContain("Grafito");
    expect(componentSource).not.toContain("Densidad");
    expect(componentSource).not.toContain("SwatchBook");
  });
});
