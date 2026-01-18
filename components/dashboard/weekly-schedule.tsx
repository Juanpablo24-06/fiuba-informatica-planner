import type { CSSProperties } from "react";
import type { CalendarEvent } from "@/lib/types";
import { DEFAULT_TIMEZONE, formatTime, getZonedHour } from "@/lib/date";
import { cn } from "@/lib/utils";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;
const dayMap: Record<string, (typeof DAYS)[number]> = {
  lun: "Lun",
  mar: "Mar",
  mié: "Mié",
  mie: "Mié",
  jue: "Jue",
  vie: "Vie",
  sáb: "Sáb",
  sab: "Sáb"
};

const START_HOUR = 8;
const END_HOUR = 22;

const getDayLabel = (value: string) => {
  const raw = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    timeZone: DEFAULT_TIMEZONE
  })
    .format(new Date(value))
    .toLowerCase();
  return dayMap[raw] ?? "";
};

const getRowPosition = (value: string) => {
  const { hour, minute } = getZonedHour(value, DEFAULT_TIMEZONE);
  const offset = hour - START_HOUR + minute / 60;
  return Math.max(0, offset);
};

export default function WeeklySchedule({ events }: { events: CalendarEvent[] }) {
  const gridRows = END_HOUR - START_HOUR;
  const gridStyle: CSSProperties = {
    gridTemplateRows: `repeat(${gridRows}, minmax(56px, 1fr))`
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Horario semanal</span>
        <span>{START_HOUR}:00 - {END_HOUR}:00</span>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[80px_repeat(6,1fr)] gap-2 text-xs">
          <div />
          {DAYS.map((day) => (
            <div key={day} className="text-center text-muted">
              {day}
            </div>
          ))}
          <div className="grid gap-2" style={gridStyle}>
            {Array.from({ length: gridRows }).map((_, index) => (
              <div
                key={`hour-${index}`}
                className="flex items-start justify-end pr-2 text-[10px] text-muted"
              >
                {START_HOUR + index}:00
              </div>
            ))}
          </div>
          {DAYS.map((day) => (
            <div key={`col-${day}`} className="relative grid gap-2" style={gridStyle}>
              {events
                .filter((event) => getDayLabel(event.startsAt) === day)
                .map((event) => {
                  const start = getRowPosition(event.startsAt);
                  const end = event.endsAt ? getRowPosition(event.endsAt) : start + 1;
                  const rowSpan = Math.max(1, Math.ceil(end - start));
                  const style = {
                    gridRow: `${Math.floor(start) + 1} / span ${rowSpan}`,
                    ...(event.color
                      ? { borderColor: event.color, boxShadow: `0 0 0 1px ${event.color}33` }
                      : {})
                  } as CSSProperties;
                  return (
                    <div
                      key={event.id}
                      style={style}
                      className={cn(
                        "rounded-2xl border border-white/[0.12] bg-surface/85 p-2 text-[11px] text-text shadow-tile",
                        event.source === "calendar" ? "border-accent/40" : "border-accent-2/40"
                      )}
                    >
                      <p className="font-semibold text-balance leading-tight">
                        {event.title}
                      </p>
                      <p className="mt-1 text-[10px] text-muted">
                        {formatTime(event.startsAt)}
                        {event.endsAt ? ` - ${formatTime(event.endsAt)}` : ""}
                      </p>
                      {event.tags?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {event.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/[0.12] bg-white/[0.03] px-2 py-0.5 text-[9px] font-semibold text-muted"
                          >
                            {tag}
                          </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
