import type { McpServer } from "@modelcontextprotocol/server";
import { registerMcpTools } from "@/lib/mcp/tools";

export const registerMcpServer = (server: McpServer) => {
  registerMcpTools(server);
};
