import { describe, expect, it, vi } from "vitest";
import { createChatService, type ChatDependencies } from "@/modules/chat/application/chat";
import { chatResponseSchema } from "@/modules/chat/domain/schemas";
import type { ChatStreamEvent } from "@/modules/chat/domain/streaming";
import type { AIProviderGateway } from "@/modules/chat/domain/provider";

const setup = () => {
  const data = chatResponseSchema.parse({ answer: "Listo", analysis_summary: "Consulté el calendario.", actions: [{ type: "create_term", term_label: "2026-2" }], warnings: [] });
  const success = { ok: true, data, provider: "openrouter", model: "fake", raw: "", reasoning: null, reasoningMode: "effort" };
  const dependencies: ChatDependencies = {
    provider: { isAIProviderConfigured: () => true, callAIJSONStream: vi.fn().mockResolvedValue(success), callAIJSON: vi.fn().mockResolvedValue(success) } as AIProviderGateway,
    memory: { searchRelevantMemories: vi.fn().mockResolvedValue([]), snapshotMemories: vi.fn(), updateMemory: vi.fn(), deleteMemory: vi.fn(), applyMemoryCandidates: vi.fn().mockResolvedValue([]), addConversationToMem0: vi.fn().mockResolvedValue(false), isMem0Configured: () => false },
    context: { load: vi.fn().mockResolvedValue({ subjects: [], recentMessages: [], context: {} }) },
    conversations: { findHistory: vi.fn().mockResolvedValue([]), createThread: vi.fn().mockResolvedValue("thread-id"), insertMessages: vi.fn().mockResolvedValue(true) },
    persistenceEnabled: () => true,
    executeAdminActions: vi.fn().mockResolvedValue([{ type: "create_term", ok: true, summary: "Creado" }])
  };
  const events: ChatStreamEvent[] = [];
  return { dependencies, events, service: createChatService(dependencies) };
};
describe("chat orchestration without HTTP, provider or database", () => {
  it.each([
    { role: "viewer" as const, allowActions: true },
    { role: "admin" as const, allowActions: false }
  ])("does not execute actions without both admin role and consent: %j", async ({ role, allowActions }) => {
    const fixture = setup();
    await fixture.service.runChat({ role, signal: new AbortController().signal, payload: { message: "Creá el cuatrimestre", allowActions, storeHistory: false }, attachments: [], emit: (event) => fixture.events.push(event) });
    expect(fixture.dependencies.executeAdminActions).not.toHaveBeenCalled();
    expect(fixture.dependencies.conversations.createThread).not.toHaveBeenCalled();
    expect(fixture.events.at(-1)).toMatchObject({ type: "done", stored: false, actionResults: [] });
  });
  it("runs authorized actions and preserves persistence metadata", async () => {
    const fixture = setup();
    await fixture.service.runChat({ role: "admin", signal: new AbortController().signal, payload: { message: "Creá el cuatrimestre", allowActions: true }, attachments: [], emit: (event) => fixture.events.push(event) });
    expect(fixture.dependencies.executeAdminActions).toHaveBeenCalledWith([expect.objectContaining({ type: "create_term", term_label: "2026-2" })]);
    expect(fixture.dependencies.conversations.insertMessages).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ role: "assistant", metadata: expect.objectContaining({ allow_actions: true, model: "fake", action_results: [expect.objectContaining({ ok: true })] }) })]));
    expect(fixture.events.at(-1)).toMatchObject({ type: "done", threadId: "thread-id", stored: true });
  });
  it("falls back from an invalid stream before executing any actions", async () => {
    const fixture = setup();
    vi.mocked(fixture.dependencies.provider.callAIJSONStream).mockResolvedValueOnce({ ok: false, error: "invalid_json" });
    await fixture.service.runChat({ role: "admin", signal: new AbortController().signal, payload: { message: "Hola", allowActions: false }, attachments: [], emit: (event) => fixture.events.push(event) });
    expect(fixture.dependencies.provider.callAIJSON).toHaveBeenCalledOnce();
    expect(fixture.dependencies.executeAdminActions).not.toHaveBeenCalled();
    expect(fixture.events.at(-1)?.type).toBe("done");
  });
  it("does not persist or mutate after a provider failure", async () => {
    const fixture = setup();
    vi.mocked(fixture.dependencies.provider.callAIJSONStream).mockResolvedValueOnce({ ok: false, error: "timeout" });
    vi.mocked(fixture.dependencies.provider.callAIJSON).mockResolvedValueOnce({ ok: false, error: "timeout" });
    await expect(fixture.service.runChat({ role: "admin", signal: new AbortController().signal, payload: { message: "Hola", allowActions: true }, attachments: [], emit: (event) => fixture.events.push(event) })).rejects.toThrow("timeout");
    expect(fixture.dependencies.executeAdminActions).not.toHaveBeenCalled();
    expect(fixture.dependencies.conversations.insertMessages).not.toHaveBeenCalled();
  });
});
