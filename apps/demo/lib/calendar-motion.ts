// Ephemeral visual feedback shared by the calendar toolbar and navigation.
export const CALENDAR_PERIOD_MOTION = "fiuba:calendar-period-motion";

export function notifyCalendarPeriodChange(previous: number, next: number) {
  if (previous === next) return;
  window.dispatchEvent(new CustomEvent(CALENDAR_PERIOD_MOTION, { detail: Math.sign(next - previous) }));
}
