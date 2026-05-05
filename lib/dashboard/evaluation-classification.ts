import type { CalendarEvent } from "@/lib/types";

export type EvaluationBucket = "parciales" | "entregas" | "finales";

export type EvaluationSection = {
  key: EvaluationBucket;
  label: string;
  events: CalendarEvent[];
};

const normalizeToken = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const hasAnyToken = (value: string, tokens: string[]) =>
  tokens.some((token) => value.includes(token));

const isClassToken = (value: string) =>
  hasAnyToken(value, ["clase", "curso", "consulta", "teoria", "practica"]);

const resolveBucket = (value: string): EvaluationBucket | null => {
  if (!value) return null;
  if (hasAnyToken(value, ["parcial", "recuperatorio", "recup"])) return "parciales";
  if (hasAnyToken(value, ["tp", "entrega", "entregable", "trabajo practico"])) return "entregas";
  if (hasAnyToken(value, ["final", "defensa", "coloquio"])) return "finales";
  return null;
};

export const classifyEvaluationEvent = (event: Pick<CalendarEvent, "title" | "type">) => {
  const typeToken = normalizeToken(event.type);
  if (typeToken) {
    if (isClassToken(typeToken)) return null;
    const bucket = resolveBucket(typeToken);
    if (bucket) return bucket;
  }

  return resolveBucket(normalizeToken(event.title));
};

const SECTION_LABELS: Record<EvaluationBucket, string> = {
  parciales: "Parciales y recuperatorios",
  entregas: "Entregas y TPs",
  finales: "Finales y defensas"
};

export const buildEvaluationSections = (events: CalendarEvent[]): EvaluationSection[] => {
  const grouped = new Map<EvaluationBucket, CalendarEvent[]>();

  for (const event of events) {
    const bucket = classifyEvaluationEvent(event);
    if (!bucket) continue;

    const current = grouped.get(bucket) ?? [];
    current.push(event);
    grouped.set(bucket, current);
  }

  return (["parciales", "entregas", "finales"] as EvaluationBucket[])
    .map((key) => ({
      key,
      label: SECTION_LABELS[key],
      events: (grouped.get(key) ?? []).slice().sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      )
    }))
    .filter((section) => section.events.length > 0);
};
