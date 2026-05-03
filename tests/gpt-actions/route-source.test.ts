import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("custom gpt action routes", () => {
  const routePath = path.join(process.cwd(), "app/api/openapi/route.ts");
  const routeSource = fs.readFileSync(routePath, "utf8");

  it("serves JSON over a dynamic node route", () => {
    expect(routeSource).toContain('export const runtime = "nodejs"');
    expect(routeSource).toContain('export const dynamic = "force-dynamic"');
    expect(routeSource).toContain("export async function GET");
  });
});
