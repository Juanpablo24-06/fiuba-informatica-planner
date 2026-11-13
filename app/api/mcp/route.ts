import { createMcpHandler } from "mcp-handler";
import type { NextRequest } from "next/server";
import { requireExternalAdminRequest } from "@/lib/external-admin-auth";
import { registerMcpServer } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const disabledHandler = async () =>
  new Response(
    JSON.stringify({
      error: "MCP deshabilitado en este entorno."
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

const activeHandler = createMcpHandler(
  async (server) => {
    registerMcpServer(server);
  },
  {
    serverInfo: {
      name: "fiuba-informatica-plan",
      version: "0.1.0"
    },
    verboseLogs: false
  }
);

const guardedActiveHandler = async (request: NextRequest) => {
  const unauthorized = requireExternalAdminRequest(request, {
    tokenEnvNames: ["MCP_BEARER_TOKEN"]
  });
  if (unauthorized) return unauthorized;

  return activeHandler(request);
};

const handler =
  process.env.MCP_ENABLED === "false" ? disabledHandler : guardedActiveHandler;

export { handler as GET, handler as POST };
