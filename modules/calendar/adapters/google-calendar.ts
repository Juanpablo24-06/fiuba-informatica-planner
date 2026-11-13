import { google } from "googleapis";
import type { CalendarGateway } from "../application/events";

export const googleCalendarGateway: CalendarGateway = {
  async load(timeMin, timeMax) {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const timezone = process.env.GOOGLE_CALENDAR_TIMEZONE ?? "America/Argentina/Buenos_Aires";
    if (!calendarId || !email || !privateKey) return { events: [] };
    const auth = new google.auth.JWT({ email, key: privateKey.replace(/\\n/g, "\n"), scopes: ["https://www.googleapis.com/auth/calendar.readonly"] });
    const calendar = google.calendar({ version: "v3", auth });
    const response = await calendar.events.list({ calendarId, timeMin, timeMax, singleEvents: true, orderBy: "startTime" });
    return {
      source: { calendarId, timezone },
      events: (response.data.items ?? []).map((event) => ({
        id: event.id ?? `${event.summary}-${event.start?.dateTime}`,
        title: event.summary ?? "Evento",
        startsAt: event.start?.dateTime ?? event.start?.date ?? "",
        endsAt: event.end?.dateTime ?? event.end?.date ?? null,
        source: "calendar" as const
      }))
    };
  }
};
