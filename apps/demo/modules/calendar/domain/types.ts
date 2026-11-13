export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  source: "calendar" | "internal";
  subject?: string;
  type?: string;
  color?: string;
  tags?: string[];
};
