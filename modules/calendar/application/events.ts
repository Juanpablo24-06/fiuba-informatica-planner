import type { CalendarEvent } from "../domain/types";

export interface CalendarGateway {
  load(timeMin: string, timeMax: string): Promise<{
    events: CalendarEvent[];
    source?: { calendarId: string; timezone: string };
  }>;
}
export interface CalendarSyncRepository {
  recordSync(source: { calendarId: string; timezone: string }): Promise<void>;
}
export const createCalendarService = (gateway: CalendarGateway, sync: CalendarSyncRepository) => ({
  async getCalendarEvents(timeMin: string, timeMax: string) {
    const response = await gateway.load(timeMin, timeMax);
    if (response.source) void sync.recordSync(response.source).catch(() => undefined);
    return response.events;
  }
});
