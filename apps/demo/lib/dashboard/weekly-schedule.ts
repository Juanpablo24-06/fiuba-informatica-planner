import { DEFAULT_TIMEZONE, getZonedHour } from "@/lib/date";
import type { CalendarEvent } from "@/lib/types";

const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 22;
const DEDUPE_OVERLAP_MS = 45 * 60 * 1000;
const DEDUPE_START_TOLERANCE_MS = 75 * 60 * 1000;

const getHourDecimal = (value: string) => {
  const { hour, minute } = getZonedHour(value, DEFAULT_TIMEZONE);
  return hour + minute / 60;
};

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DEFAULT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const normalizeToken = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const isGeneratedScheduleEvent = (event: CalendarEvent) => event.id.startsWith("schedule-");

const isClassLikeEvent = (event: CalendarEvent) => {
  const normalizedType = normalizeToken(event.type);
  return normalizedType === "clase" || normalizedType === "class";
};

const getEventDayKey = (value: string) => dayKeyFormatter.format(new Date(value));

const getEventRange = (event: CalendarEvent) => {
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start + 60 * 60 * 1000;
  return { start, end: Math.max(end, start + 60 * 60 * 1000) };
};

const getEventIdentity = (event: CalendarEvent) =>
  normalizeToken(event.subject) || normalizeToken(event.title);

const getOverlapMs = (first: CalendarEvent, second: CalendarEvent) => {
  const firstRange = getEventRange(first);
  const secondRange = getEventRange(second);
  return Math.max(0, Math.min(firstRange.end, secondRange.end) - Math.max(firstRange.start, secondRange.start));
};

const areLikelyDuplicateClassEvents = (first: CalendarEvent, second: CalendarEvent) => {
  const oneIsGenerated = isGeneratedScheduleEvent(first) || isGeneratedScheduleEvent(second);
  if (!oneIsGenerated && !(isClassLikeEvent(first) && isClassLikeEvent(second))) {
    return false;
  }

  if (getEventDayKey(first.startsAt) !== getEventDayKey(second.startsAt)) {
    return false;
  }

  if (!getEventIdentity(first) || getEventIdentity(first) !== getEventIdentity(second)) {
    return false;
  }

  const firstRange = getEventRange(first);
  const secondRange = getEventRange(second);
  return (
    Math.abs(firstRange.start - secondRange.start) <= DEDUPE_START_TOLERANCE_MS &&
    getOverlapMs(first, second) >= DEDUPE_OVERLAP_MS
  );
};

const getEventPreferenceScore = (event: CalendarEvent) =>
  (isGeneratedScheduleEvent(event) ? 0 : 4) +
  (event.tags?.length ?? 0) +
  (event.type ? 1 : 0) +
  (event.color ? 1 : 0) +
  (event.endsAt ? 1 : 0);

export const dedupeWeeklyScheduleEvents = (events: CalendarEvent[]) => {
  const deduped: CalendarEvent[] = [];

  for (const event of events) {
    const existingIndex = deduped.findIndex((current) =>
      areLikelyDuplicateClassEvents(current, event)
    );

    if (existingIndex === -1) {
      deduped.push(event);
      continue;
    }

    if (getEventPreferenceScore(event) > getEventPreferenceScore(deduped[existingIndex])) {
      deduped[existingIndex] = event;
    }
  }

  return deduped;
};

export const getWeeklyScheduleHourBounds = (events: CalendarEvent[]) => {
  if (!events.length) {
    return {
      startHour: DEFAULT_START_HOUR,
      endHour: DEFAULT_END_HOUR
    };
  }

  let earliestHour = Number.POSITIVE_INFINITY;
  let latestHour = Number.NEGATIVE_INFINITY;

  for (const event of events) {
    const start = getHourDecimal(event.startsAt);
    const end = event.endsAt ? getHourDecimal(event.endsAt) : start + 1;
    earliestHour = Math.min(earliestHour, start);
    latestHour = Math.max(latestHour, end > start ? end : start + 1);
  }

  return {
    startHour: Math.min(DEFAULT_START_HOUR, Math.floor(earliestHour)),
    endHour: Math.max(22, Math.ceil(latestHour))
  };
};
