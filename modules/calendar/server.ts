import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { createCalendarService } from "./application/events";
import { googleCalendarGateway } from "./adapters/google-calendar";
import { calendarSyncRepository } from "./adapters/supabase-sync";
const CALENDAR_TAG = "calendar-events";
const service = createCalendarService(googleCalendarGateway, calendarSyncRepository);
export const getCalendarEvents = unstable_cache(service.getCalendarEvents, [CALENDAR_TAG], { revalidate: 60 * 30, tags: [CALENDAR_TAG] });
export const refreshCalendarCache = () => revalidateTag(CALENDAR_TAG, "max");
