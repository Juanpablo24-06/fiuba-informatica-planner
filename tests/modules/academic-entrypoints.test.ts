import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { McpServer } from "@modelcontextprotocol/server";
import type { PlannerEntryService } from "@/modules/planning/application/entries";
import type { makeAcademicFixture } from "./academic-fixture";

const state = vi.hoisted(() => ({ fixture: null as unknown as ReturnType<typeof makeAcademicFixture> }));
vi.mock("@/modules/academic/server", async () => {
  const { makeAcademicFixture: createFixture } = await import("./academic-fixture");
  state.fixture = createFixture();
  return {
    academicService: state.fixture.service,
    cbcService: { getBootstrapStatus: vi.fn(), bootstrapCbc: vi.fn() }
  };
});
vi.mock("@/lib/auth", () => ({ requireRoleFromRequest: () => ({ role: "admin" }) }));
vi.mock("@/lib/external-admin-auth", () => ({ requireExternalAdminRequest: () => null }));

import { PATCH as patchPanelTerm } from "@/app/api/terms/[id]/route";
import { PATCH as patchGptTerm } from "@/app/api/gpt-actions/terms/[id]/route";
import { PATCH as patchPanelEvent } from "@/app/api/events/[id]/route";
import { PATCH as patchGptEvent } from "@/app/api/gpt-actions/events/[id]/route";
import { registerMcpTools } from "@/lib/mcp/tools";
import { createAdminActionService } from "@/modules/chat/application/admin-actions";
import { termId, eventId } from "./academic-fixture";

type ToolResult = { isError?: boolean; structuredContent: Record<string, unknown> };
const tools = new Map<string, (input: Record<string, unknown>) => Promise<ToolResult>>();
registerMcpTools({
  registerTool: (name: string, _config: unknown, handler: (input: Record<string, unknown>) => Promise<ToolResult>) => {
    tools.set(name, handler);
  }
} as unknown as McpServer);
const actions = createAdminActionService(state.fixture.service, {} as PlannerEntryService);
const request = (body: Record<string, unknown>) => new NextRequest("http://localhost/api/test", {
  method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
});
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  state.fixture.terms.set(termId, { id: termId, label: "2026-1", start_date: "2026-03-10", end_date: "2026-07-15", is_current: true });
});

describe("shared academic operations across panel, GPT Actions, MCP and chat", () => {
  it("rejects a partial term range consistently before changing persisted state", async () => {
    const patch = { start_date: "2026-08-01", is_current: true };
    expect((await patchPanelTerm(request(patch), params(termId))).status).toBe(400);
    expect((await patchGptTerm(request(patch), params(termId))).status).toBe(400);
    expect(await tools.get("update_term")!({ id: termId, ...patch })).toMatchObject({ isError: true, structuredContent: { ok: false } });
    expect(await actions.executeAdminActions([{ type: "update_term", term_label: "2026-1", ...patch }])).toMatchObject([{ ok: false }]);
    expect(state.fixture.termRepository.clearCurrent).not.toHaveBeenCalled();
    expect(state.fixture.termRepository.update).not.toHaveBeenCalled();
    expect(state.fixture.terms.get(termId)?.is_current).toBe(true);
  });

  it("checks partial event patches against the same persisted start date", async () => {
    const patch = { ends_at: "2026-04-10T18:00:00Z" };
    expect((await patchPanelEvent(request(patch), params(eventId))).status).toBe(400);
    expect((await patchGptEvent(request(patch), params(eventId))).status).toBe(400);
    expect(await tools.get("update_event")!({ id: eventId, ...patch })).toMatchObject({ isError: true, structuredContent: { ok: false } });
    expect(await actions.executeAdminActions([{ type: "update_event", term_label: "2026-1", subject_query: "Algoritmos", event_query: "Parcial 1", ...patch }])).toMatchObject([{ ok: false }]);
    expect(state.fixture.eventRepository.update).not.toHaveBeenCalled();
  });

  it("persists valid changes through the same injected repository from every entry point", async () => {
    expect((await patchPanelTerm(request({ end_date: "2026-07-16" }), params(termId))).status).toBe(200);
    expect((await patchGptTerm(request({ end_date: "2026-07-17" }), params(termId))).status).toBe(200);
    expect(await tools.get("update_term")!({ id: termId, end_date: "2026-07-18" })).toMatchObject({ structuredContent: { ok: true } });
    expect(await actions.executeAdminActions([{ type: "update_term", term_label: "2026-1", end_date: "2026-07-19" }])).toMatchObject([{ ok: true }]);
    expect(state.fixture.termRepository.update).toHaveBeenCalledTimes(4);
    expect(state.fixture.terms.get(termId)?.end_date).toBe("2026-07-19");
  });
});
