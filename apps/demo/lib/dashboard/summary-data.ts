import type { CalendarEvent, Event } from "@/lib/types";

export const DAY_MS = 24 * 60 * 60 * 1000;

export const PHRASES_EDITORIALES = [
  "Una materia a la vez, una carrera completa.",
  "Lo importante no es correr: es sostener el ritmo.",
  "Cada semana ordenada te acerca al título.",
  "Menos ruido, más foco en lo que sí suma.",
  "Tu progreso también se construye en días tranquilos."
];

export const buildInternalEvents = (events: Event[]): CalendarEvent[] =>
  events.map((event) => ({
    id: event.id,
    title: event.title ?? event.type,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    source: "internal" as const,
    subject: event.enrollment?.subject?.name,
    type: event.type,
    color: event.enrollment?.color ?? undefined
  }));

export const splitSchedulePreview = (preview: string) => {
  const match = preview.match(/^(.*?)(\d{2}:\d{2}-\d{2}:\d{2}.*)$/);
  if (!match) {
    return { days: preview.trim(), time: null as string | null };
  }

  return {
    days: match[1].trim(),
    time: match[2].trim()
  };
};

export const groupEventsByEnrollment = (events: Event[]) => {
  const grouped = new Map<string, Event[]>();
  for (const event of events) {
    const current = grouped.get(event.enrollment_id) ?? [];
    current.push(event);
    grouped.set(event.enrollment_id, current);
  }
  return grouped;
};

const sortEventsByStartAt = (a: Event, b: Event) =>
  new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();

const isFutureEvent = (event: Pick<Event, "starts_at">, nowTime: number) =>
  new Date(event.starts_at).getTime() >= nowTime;

export const getNextFutureEventByEnrollment = (
  events: Event[],
  now = new Date()
) => {
  const nowTime = now.getTime();
  const futureEvents = events.filter((event) => isFutureEvent(event, nowTime));
  const grouped = groupEventsByEnrollment(futureEvents);
  const nextByEnrollment = new Map<string, Event | undefined>();

  for (const [enrollmentId, enrollmentEvents] of grouped.entries()) {
    nextByEnrollment.set(
      enrollmentId,
      [...enrollmentEvents].sort(sortEventsByStartAt)[0]
    );
  }

  return nextByEnrollment;
};

export const getUpcomingMergedEvents = ({
  calendarEvents,
  internalEvents,
  now = new Date(),
  limit
}: {
  calendarEvents: CalendarEvent[];
  internalEvents: Event[];
  now?: Date;
  limit?: number;
}) => {
  const nowTime = now.getTime();
  const merged = [
    ...calendarEvents,
    ...buildInternalEvents(internalEvents)
  ]
    .filter((event) => new Date(event.startsAt).getTime() >= nowTime)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return typeof limit === "number" ? merged.slice(0, limit) : merged;
};

export const calcLoad = (events: CalendarEvent[], now = new Date()) => {
  const nowTime = now.getTime();
  const nextWeek = nowTime + 7 * DAY_MS;
  const weekEvents = events.filter((event) => {
    const time = new Date(event.startsAt).getTime();
    return time >= nowTime && time <= nextWeek;
  });
  const exams = weekEvents.filter((event) =>
    ["parcial", "final", "exam"].includes((event.type ?? "").toLowerCase())
  ).length;

  if (weekEvents.length >= 10 || exams >= 2) {
    return {
      label: "Alta",
      mood: "Modo parciales activado",
      level: "alta" as const,
      weekEvents: weekEvents.length,
      exams
    };
  }
  if (weekEvents.length >= 6 || exams >= 1) {
    return {
      label: "Media",
      mood: "Semana intensa, pero manejable",
      level: "media" as const,
      weekEvents: weekEvents.length,
      exams
    };
  }
  return {
    label: "Baja",
    mood: "Todo bajo control",
    level: "baja" as const,
    weekEvents: weekEvents.length,
    exams
  };
};

export const getEditorialPhrase = (seed: number) => {
  const index = Math.abs(seed) % PHRASES_EDITORIALES.length;
  return PHRASES_EDITORIALES[index];
};
