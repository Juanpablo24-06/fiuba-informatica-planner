import type { CSSProperties } from "react";
import type { CalendarEvent } from "@/lib/types";
import { DEFAULT_TIMEZONE, formatTime, getZonedHour } from "@/lib/date";
import { getWeeklyScheduleHourBounds } from "@/lib/dashboard/weekly-schedule";
import { cn } from "@/lib/utils";

const DAYS = [
  { short: "Lun", long: "Lunes" },
  { short: "Mar", long: "Martes" },
  { short: "Mié", long: "Miércoles" },
  { short: "Jue", long: "Jueves" },
  { short: "Vie", long: "Viernes" },
  { short: "Sáb", long: "Sábado" }
] as const;
const dayMap: Record<string, (typeof DAYS)[number]["short"]> = {
  lun: "Lun",
  mar: "Mar",
  mié: "Mié",
  mie: "Mié",
  jue: "Jue",
  vie: "Vie",
  sáb: "Sáb",
  sab: "Sáb"
};

const getDayLabel = (value: string) => {
  const raw = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    timeZone: DEFAULT_TIMEZONE
  })
    .format(new Date(value))
    .toLowerCase();
  return dayMap[raw] ?? "";
};

const getEventRenderKey = (event: CalendarEvent, index: number) =>
  `${event.id}-${event.startsAt}-${event.endsAt ?? "open"}-${index}`;

export default function WeeklySchedule({ events }: { events: CalendarEvent[] }) {
  const { startHour, endHour } = getWeeklyScheduleHourBounds(events);
  const gridRows = Math.max(1, endHour - startHour);
  const gridStyle: CSSProperties = {
    gridTemplateRows: `repeat(${gridRows}, minmax(72px, 1fr))`
  };
  const dayGroups = DAYS.map((day) => {
    const dayEvents = events
      .filter((event) => getDayLabel(event.startsAt) === day.short)
      .slice()
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    return { ...day, events: dayEvents };
  });
  const mobileDayGroups = dayGroups.filter((group) => group.events.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>Horario semanal</span>
        <span>
          {`${startHour}:00 - ${endHour}:00`}
        </span>
      </div>
      <div className="space-y-3 md:hidden">
        {mobileDayGroups.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-surface/75 px-4 py-6 text-center text-sm text-muted">
            No hay eventos programados para esta semana.
          </div>
        ) : (
          mobileDayGroups.map((group) => (
            <section key={group.short} className="overflow-hidden rounded-2xl border border-border/55 bg-surface/80 shadow-sm">
              <header className="flex items-center justify-between border-b border-border/45 bg-surface-2/40 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                  {group.long}
                </p>
                <p className="text-[10px] text-muted">
                  {group.events.length} {group.events.length === 1 ? "evento" : "eventos"}
                </p>
              </header>
              <div className="divide-y divide-border/45">
                {group.events.map((event, index) => {
                  const style = {
                    ...(event.color
                      ? { borderColor: event.color, boxShadow: `0 0 0 1px ${event.color}33` }
                      : {})
                  } as CSSProperties;

                  return (
                    <article key={getEventRenderKey(event, index)} className="flex items-start gap-3 px-3 py-2.5">
                      <span
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-transparent"
                        style={{
                          backgroundColor:
                            event.color ??
                            (event.source === "calendar"
                              ? "rgb(var(--color-accent-2))"
                              : "rgb(var(--color-accent))"),
                          ...style
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-text">
                            {event.title}
                          </p>
                          <p className="shrink-0 text-[11px] font-medium text-muted">
                            {formatTime(event.startsAt)}
                            {event.endsAt ? ` - ${formatTime(event.endsAt)}` : ""}
                          </p>
                        </div>
                        {event.tags?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {event.tags.slice(0, 2).map((tag, tagIndex) => (
                              <span
                                key={`${event.id}-${tag}-${tagIndex}`}
                                className="rounded-full border border-border/60 bg-surface-2/70 px-2 py-0.5 text-[9px] font-semibold text-muted"
                              >
                                {tag}
                              </span>
                            ))}
                            {event.tags.length > 2 ? (
                              <span className="rounded-full border border-border/40 bg-surface/70 px-2 py-0.5 text-[9px] font-semibold text-muted">
                                +{event.tags.length - 2}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
      <div className="hidden md:block">
        <div className="grid grid-cols-[76px_repeat(6,minmax(0,1fr))] gap-3 text-xs">
          <div />
          {dayGroups.map((day) => (
            <div
              key={day.short}
              className="px-1 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
            >
              {day.short}
            </div>
          ))}
          <div className="grid gap-3 pt-2" style={gridStyle}>
            {Array.from({ length: gridRows }).map((_, index) => (
              <div
                key={`hour-${index}`}
                className="flex items-start justify-end pr-2 text-[10px] font-medium text-muted"
              >
                {`${startHour + index}:00`}
              </div>
            ))}
          </div>
          {dayGroups.map((day) => (
            <div
              key={`col-${day.short}`}
              className="relative grid gap-3 rounded-[1.7rem] border border-border/40 bg-surface/40 p-2.5"
              style={gridStyle}
            >
              {Array.from({ length: gridRows }).map((_, index) => (
                <div
                  key={`${day.short}-slot-${index}`}
                  className="rounded-[1.05rem] border border-border/15 bg-surface/15"
                />
              ))}
              {day.events.map((event, index) => {
                  const { hour: startEventHour, minute: startEventMinute } = getZonedHour(
                    event.startsAt,
                    DEFAULT_TIMEZONE
                  );
                  const start = Math.max(
                    0,
                    startEventHour + startEventMinute / 60 - startHour
                  );
                  const endEventHour = event.endsAt
                    ? getZonedHour(event.endsAt, DEFAULT_TIMEZONE)
                    : undefined;
                  const end = event.endsAt
                    ? Math.max(
                        start + 1,
                        (endEventHour?.hour ?? startEventHour) +
                          (endEventHour?.minute ?? startEventMinute) / 60 -
                          startHour
                      )
                    : start + 1;
                  const rowSpan = Math.max(1, Math.ceil(end - start));
                  const style = {
                    gridRow: `${Math.floor(start) + 1} / span ${rowSpan}`,
                    ...(event.color
                      ? { borderColor: event.color, boxShadow: `0 0 0 1px ${event.color}33` }
                      : {})
                  } as CSSProperties;
                  return (
                    <div
                      key={getEventRenderKey(event, index)}
                      style={style}
                      className={cn(
                        "relative z-10 rounded-2xl border border-border/60 bg-surface/88 p-3 text-[11px] text-text shadow-soft",
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
                          {event.tags.slice(0, 2).map((tag, tagIndex) => (
                            <span
                              key={`${event.id}-${tag}-${tagIndex}`}
                              className="rounded-full border border-border/60 bg-surface-2/70 px-2 py-0.5 text-[9px] font-semibold text-muted"
                            >
                              {tag}
                            </span>
                          ))}
                          {event.tags.length > 2 ? (
                            <span className="rounded-full border border-border/40 bg-surface/70 px-2 py-0.5 text-[9px] font-semibold text-muted">
                              +{event.tags.length - 2}
                            </span>
                          ) : null}
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
