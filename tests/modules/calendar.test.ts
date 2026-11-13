import { describe, expect, it, vi } from "vitest";
import { createCalendarService } from "@/modules/calendar/application/events";

describe("calendar gateway substitution", () => {
  it("returns external events and records successful synchronization", async () => {
    const events = [{ id: "event", title: "Clase", startsAt: "2026-04-10", endsAt: null, source: "calendar" as const }];
    const recordSync = vi.fn().mockResolvedValue(undefined);
    const load = vi.fn().mockResolvedValue({ events, source: { calendarId: "calendar", timezone: "America/Argentina/Buenos_Aires" } });
    expect(await createCalendarService({ load }, { recordSync }).getCalendarEvents("from", "to")).toEqual(events);
    expect(load).toHaveBeenCalledWith("from", "to");
    expect(recordSync).toHaveBeenCalledWith({ calendarId: "calendar", timezone: "America/Argentina/Buenos_Aires" });
  });
  it("does not create a source when Calendar is unconfigured", async () => {
    const recordSync = vi.fn();
    expect(await createCalendarService({ load: async () => ({ events: [] }) }, { recordSync }).getCalendarEvents("from", "to")).toEqual([]);
    expect(recordSync).not.toHaveBeenCalled();
  });
  it("preserves availability when sync metadata cannot be saved", async () => {
    const recordSync = vi.fn().mockRejectedValue(new Error("offline"));
    const service = createCalendarService({ load: async () => ({ events: [], source: { calendarId: "calendar", timezone: "UTC" } }) }, { recordSync });
    await expect(service.getCalendarEvents("from", "to")).resolves.toEqual([]);
  });
});
