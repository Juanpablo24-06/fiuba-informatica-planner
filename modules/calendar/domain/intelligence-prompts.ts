export const buildEnrichmentPrompt = (
  events: Array<{
    provider_event_id: string;
    source: string;
    title: string | null;
    description: string | null;
    location: string | null;
    starts_at: string;
    ends_at: string | null;
  }>,
  subjects: Array<{ id: string; name: string; code: string | null }>
) => {
  return [
    "Clasifica eventos academicos. Responde SOLO JSON valido.",
    "Debes devolver un objeto con la clave enrichments (array).",
    "Cada enrichment corresponde a un evento y debe incluir provider_event_id.",
    "Si faltan datos, usa needs_review=true y explica brevemente.",
    "Schema esperado:",
    JSON.stringify(
      {
        enrichments: [
          {
            provider_event_id: "string",
            kind: "exam | class | tp | final | meeting | other | unknown",
            subject_id: "uuid o null",
            instance: "1 | 2 | recup | null",
            priority: 1,
            tags: ["Parcial 1"],
            confidence: 0.0,
            needs_review: false,
            explanation_short: "texto corto",
            model: "provider-model"
          }
        ]
      },
      null,
      2
    ),
    "Materias disponibles (id, name, code):",
    JSON.stringify(subjects, null, 2),
    "Eventos a enriquecer:",
    JSON.stringify(events, null, 2)
  ].join("\n");
};

export const buildWeeklyPrompt = (range: { start: string; end: string }, items: any[]) =>
  [
    "Resume la semana academica. Responde SOLO JSON valido.",
    "Schema esperado:",
    JSON.stringify(
      {
        week_start: range.start,
        week_end: range.end,
        title: "string",
        highlights: ["string"],
        deadlines: ["string"],
        risks: ["string"],
        focus_subjects: ["string"],
        action_items: ["string"],
        confidence: 0.0,
        model: "provider-model"
      },
      null,
      2
    ),
    "Eventos con enrichments:",
    JSON.stringify(items, null, 2)
  ].join("\n");
