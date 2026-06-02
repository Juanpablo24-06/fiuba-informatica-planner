import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("mcp route source", () => {
  const routePath = path.join(process.cwd(), "app/api/mcp/route.ts");
  const routeSource = fs.readFileSync(routePath, "utf8");

  it("runs on node and stays dynamic for remote MCP transport", () => {
    expect(routeSource).toContain('export const runtime = "nodejs"');
    expect(routeSource).toContain('export const dynamic = "force-dynamic"');
  });

  it("exports GET and POST handlers for remote clients", () => {
    expect(routeSource).toContain("export { handler as GET, handler as POST }");
  });

  it("requires route-local external admin auth before registering the transport", () => {
    expect(routeSource).toContain("requireExternalAdminRequest");
    expect(routeSource).toContain('"MCP_BEARER_TOKEN"');
    expect(routeSource).toContain("guardedActiveHandler");
  });
});
