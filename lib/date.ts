export const DEFAULT_TIMEZONE =
  process.env.GOOGLE_CALENDAR_TIMEZONE ?? "America/Argentina/Buenos_Aires";

export const formatDate = (value: string, timeZone = DEFAULT_TIMEZONE) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(date);
};

export const formatTime = (value: string, timeZone = DEFAULT_TIMEZONE) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
};

export const formatDateTime = (value: string, timeZone = DEFAULT_TIMEZONE) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
};

export const getWeekRange = (reference = new Date()) => {
  const day = reference.getDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(reference);
  start.setDate(reference.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
};

export const getZonedHour = (value: string, timeZone = DEFAULT_TIMEZONE) => {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { hour, minute };
};

export const getZonedWeekday = (value: string, timeZone = DEFAULT_TIMEZONE) => {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone,
    weekday: "short"
  }).formatToParts(date);
  return parts.find((p) => p.type === "weekday")?.value ?? "";
};
