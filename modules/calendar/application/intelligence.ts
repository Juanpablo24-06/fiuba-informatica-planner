import type { AIProviderGateway } from "@/modules/chat/domain/provider";
import { calendarEnrichmentBatchSchema, weeklySummarySchema } from "@/modules/chat/domain/schemas";
import { buildEnrichmentPrompt, buildWeeklyPrompt } from "../domain/intelligence-prompts";

export type CalendarRange = { start: string; end: string };
export type CalendarRawEvent = {
  id: string; provider_event_id: string; source: string; title: string | null;
  description: string | null; location: string | null; starts_at: string; ends_at: string | null;
  calendar_event_enrichments?: { kind: string | null; instance: string | null; tags: string[] | null; needs_review: boolean | null; confidence: number | null; subject_id: string | null }[];
};
export type CalendarEnrichmentRow = {
  event_id: string; kind: string | null; subject_id: string | null; instance: string | null;
  priority: number | null; tags: string[] | null; confidence: number | null;
  needs_review: boolean; explanation_short: string | null; model: string | null;
};
export interface CalendarIntelligenceRepository {
  listEvents(range: CalendarRange, withEnrichments?: boolean): Promise<CalendarRawEvent[]>;
  listSubjects(ids?: string[]): Promise<{ id: string; name: string; code: string | null }[]>;
  saveEnrichments(rows: CalendarEnrichmentRow[]): Promise<void>;
}
export const createCalendarIntelligenceService = (repository: CalendarIntelligenceRepository, provider: Pick<AIProviderGateway, "callAIJSON">, fallbackModel = () => "unknown") => ({
  async enrich(range: CalendarRange) {
    const events = await repository.listEvents(range);
    if (!events.length) return { ok: true, message: "No hay eventos raw en el rango." };
    const subjects = await repository.listSubjects();
    const result = await provider.callAIJSON(buildEnrichmentPrompt(events, subjects), calendarEnrichmentBatchSchema);
    const rawByProviderId = new Map(events.map((event) => [event.provider_event_id, event]));
    const rows: CalendarEnrichmentRow[] = result.ok ? result.data.enrichments.flatMap((enrichment) => {
      const event = rawByProviderId.get(enrichment.provider_event_id);
      if (!event) return [];
      return [{ event_id: event.id, kind: enrichment.kind ?? "unknown", subject_id: enrichment.subject_id ?? null, instance: enrichment.instance ?? null, priority: enrichment.priority ?? null, tags: enrichment.tags ?? [], confidence: enrichment.confidence ?? null, needs_review: enrichment.needs_review ?? false, explanation_short: enrichment.explanation_short ?? null, model: enrichment.model ?? result.model }];
    }) : events.map((event) => ({ event_id: event.id, kind: "unknown", subject_id: null, instance: null, priority: null, tags: [], confidence: 0, needs_review: true, explanation_short: "Respuesta AI invalida o incompleta.", model: fallbackModel() }));
    if (!rows.length) return { ok: true, message: "Sin enrichments aplicables." };
    await repository.saveEnrichments(rows);
    return { ok: true, count: rows.length, needs_review: !result.ok };
  },
  async summarize(range: CalendarRange) {
    const events = await repository.listEvents(range, true);
    if (!events.length) return { ok: true, message: "No hay eventos en el rango." };
    const ids = [...new Set(events.flatMap((event) => (event.calendar_event_enrichments ?? []).map((item) => item.subject_id)).filter((id): id is string => Boolean(id)))];
    // Names are optional context; preserve summaries when this lookup fails.
    const subjects = ids.length ? await repository.listSubjects(ids).catch(() => []) : [];
    const subjectMap = new Map(subjects.map((subject) => [subject.id, subject.name]));
    const items = events.flatMap((event) => !(event.calendar_event_enrichments?.length) ? [] : [{ provider_event_id: event.provider_event_id, title: event.title, starts_at: event.starts_at, ends_at: event.ends_at, source: event.source, enrichments: event.calendar_event_enrichments.map((item) => ({ kind: item.kind, instance: item.instance, tags: item.tags ?? [], needs_review: item.needs_review ?? false, confidence: item.confidence, subject: item.subject_id ? subjectMap.get(item.subject_id) ?? null : null })) }]);
    const result = await provider.callAIJSON(buildWeeklyPrompt(range, items), weeklySummarySchema);
    if (!result.ok) throw Object.assign(new Error("Respuesta AI invalida o incompleta."), { status: 502, needs_review: true });
    return { ok: true, summary: { ...result.data, model: result.model } };
  }
});
