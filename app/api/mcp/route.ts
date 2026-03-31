import { createMcpHandler } from "mcp-handler";
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
    }
  },
  {
    basePath: "/api",
    disableSse: true,
    maxDuration: 60,
    verboseLogs: false
  }
);

const handler = process.env.MCP_ENABLED === "false" ? disabledHandler : activeHandler;

export { handler as GET, handler as POST };
