import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMcpTools } from "@/lib/mcp/tools";

export const registerMcpServer = (server: McpServer) => {
  registerMcpTools(server);
};
