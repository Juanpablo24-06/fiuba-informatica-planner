import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readRoute = (routePath: string) =>
  fs.readFileSync(path.join(process.cwd(), routePath), "utf8");

describe("app route loading source", () => {
  const routeSources = [
    "app/(app)/page.tsx",
    "app/(app)/mapa/page.tsx",
    "app/(app)/admin/page.tsx",
    "app/(app)/agenda/semana/page.tsx",
    "app/(app)/agenda/evaluaciones/page.tsx"
  ].map((routePath) => ({
    routePath,
    source: readRoute(routePath)
  }));

  it("does not keep an extra page-level timeout now that the shell and loading routes own the loaders", () => {
    for (const route of routeSources) {
      expect(route.source, route.routePath).not.toContain("setTimeout(resolve, 1500)");
      expect(route.source, route.routePath).not.toContain(
        "await new Promise((resolve) => setTimeout(resolve, 1500));"
      );
    }
  });
});
