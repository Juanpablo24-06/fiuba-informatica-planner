import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("keepalive route runtime mode", () => {
  const routeSource = fs.readFileSync(
    path.join(process.cwd(), "app/api/cron/keepalive/route.ts"),
    "utf8"
  );

  it("forces runtime execution so the build does not prerender a Supabase-backed endpoint", () => {
    expect(routeSource).toContain('export const dynamic = "force-dynamic";');
  });
});
