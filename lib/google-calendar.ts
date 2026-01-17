import { google } from "googleapis";
import { unstable_cache, revalidateTag } from "next/cache";
import type { CalendarEvent } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase-admin";

const CALENDAR_TAG = "calendar-events";

const getCalendarConfig = () => {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const timezone = process.env.GOOGLE_CALENDAR_TIMEZONE ?? "America/Argentina/Buenos_Aires";

  if (!calendarId || !email || !privateKey) {
    return null;
  }

  return {
    calendarId,
    email,
    privateKey: privateKey.replace(/\\n/g, "\n"),
    timezone
  };
};

const fetchCalendarEvents = async (
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> => {
  const config = getCalendarConfig();
  if (!config) return [];

  const auth = new google.auth.JWT({
    email: config.email,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"]
  });

  const calendar = google.calendar({ version: "v3", auth });
  const response = await calendar.events.list({
    calendarId: config.calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime"
  });

  const events = (response.data.items ?? []).map((event) => ({
    id: event.id ?? `${event.summary}-${event.start?.dateTime}`,
    title: event.summary ?? "Evento",
    startsAt: event.start?.dateTime ?? event.start?.date ?? "",
    endsAt: event.end?.dateTime ?? event.end?.date ?? null,
    source: "calendar" as const
  }));

  await supabaseAdmin.from("calendar_sources").upsert(
    {
      calendar_id: config.calendarId,
      timezone: config.timezone,
      last_synced_at: new Date().toISOString()
    },
    { onConflict: "calendar_id" }
  );

  return events;
};

export const getCalendarEvents = unstable_cache(fetchCalendarEvents, [CALENDAR_TAG], {
  revalidate: 60 * 30,
  tags: [CALENDAR_TAG]
});

export const refreshCalendarCache = () => revalidateTag(CALENDAR_TAG);
