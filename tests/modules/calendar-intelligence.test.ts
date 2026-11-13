import { describe, expect, it, vi } from "vitest";
import { createCalendarIntelligenceService, type CalendarRawEvent } from "@/modules/calendar/application/intelligence";
import type { AIProviderGateway } from "@/modules/chat/domain/provider";
import { calendarEnrichmentBatchSchema, weeklySummarySchema } from "@/modules/chat/domain/schemas";

const event: CalendarRawEvent = { id: "raw-1", provider_event_id: "external-1", source: "google", title: "Parcial", description: null, location: null, starts_at: "2026-04-10T19:00:00Z", ends_at: null };
const range = { start: "2026-04-01T00:00:00Z", end: "2026-04-30T00:00:00Z" };
describe("calendar intelligence through replaceable ports", () => {
  it("saves a review fallback when the provider fails", async () => {
    const saveEnrichments = vi.fn().mockResolvedValue(undefined);
    const repository = { listEvents: async () => [event], listSubjects: async () => [], saveEnrichments };
    const provider = { callAIJSON: vi.fn().mockResolvedValue({ ok: false, error: "timeout" }) } as Pick<AIProviderGateway, "callAIJSON">;
    expect(await createCalendarIntelligenceService(repository, provider, () => "test-model").enrich(range)).toEqual({ ok: true, count: 1, needs_review: true });
    expect(saveEnrichments).toHaveBeenCalledWith([expect.objectContaining({ event_id: "raw-1", needs_review: true, confidence: 0, model: "test-model" })]);
  });
  it("ignores enrichments for events outside the requested snapshot", async () => {
    const saveEnrichments = vi.fn();
    const data = calendarEnrichmentBatchSchema.parse({ enrichments: [{ provider_event_id: "unrequested", kind: "unknown" }] });
    const provider = { callAIJSON: vi.fn().mockResolvedValue({ ok: true, data, model: "fake" }) } as Pick<AIProviderGateway, "callAIJSON">;
    const service = createCalendarIntelligenceService({ listEvents: async () => [event], listSubjects: async () => [], saveEnrichments }, provider);
    expect(await service.enrich(range)).toMatchObject({ ok: true, message: "Sin enrichments aplicables." });
    expect(saveEnrichments).not.toHaveBeenCalled();
  });
  it("builds weekly context with subject names and returns the provider model", async () => {
    const data = weeklySummarySchema.parse({ week_start: range.start, week_end: range.end, title: "Semana", highlights: [], deadlines: [], risks: [], focus_subjects: [], action_items: [] });
    const callAIJSON = vi.fn().mockResolvedValue({ ok: true, data, model: "fake" });
    const provider = { callAIJSON } as Pick<AIProviderGateway, "callAIJSON">;
    const service = createCalendarIntelligenceService({ listEvents: async () => [{ ...event, calendar_event_enrichments: [{ kind: "exam", subject_id: "subject", tags: [], instance: "1", confidence: 1, needs_review: false }] }], listSubjects: async () => [{ id: "subject", name: "Álgebra", code: "61.03" }], saveEnrichments: vi.fn() }, provider);
    expect(await service.summarize(range)).toMatchObject({ ok: true, summary: { model: "fake" } });
    expect(callAIJSON).toHaveBeenCalledWith(expect.stringContaining("Álgebra"), weeklySummarySchema);
  });
});
