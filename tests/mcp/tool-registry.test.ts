import { describe, expect, it } from "vitest";
import { MCP_TOOL_NAMES } from "@/lib/mcp/tools";

describe("mcp tool registry", () => {
  it("exposes the expected read tools", () => {
    expect(MCP_TOOL_NAMES).toEqual(
      expect.arrayContaining([
        "list_terms",
        "get_current_term",
        "list_subjects",
        "list_enrollments",
        "list_events",
        "get_admin_snapshot",
        "get_bootstrap_cbc_status"
      ])
    );
  });

  it("exposes the expected write tools", () => {
    expect(MCP_TOOL_NAMES).toEqual(
      expect.arrayContaining([
        "create_term",
        "update_term",
        "delete_term",
        "create_subject",
        "update_subject",
        "delete_subject",
        "create_enrollment",
        "update_enrollment",
        "delete_enrollment",
        "create_event",
        "update_event",
        "delete_event",
        "bootstrap_cbc"
      ])
    );
  });
});
