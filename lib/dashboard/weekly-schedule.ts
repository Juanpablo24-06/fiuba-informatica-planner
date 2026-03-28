import { DEFAULT_TIMEZONE, getZonedHour } from "@/lib/date";
import type { CalendarEvent } from "@/lib/types";

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 22;

const getHourDecimal = (value: string) => {
  const { hour, minute } = getZonedHour(value, DEFAULT_TIMEZONE);
  return hour + minute / 60;
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
    startHour: Math.max(7, Math.floor(earliestHour)),
    endHour: Math.min(22, Math.ceil(latestHour))
  };
};
