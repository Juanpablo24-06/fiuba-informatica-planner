import type { CalendarEvent } from "@/lib/types";
import { DEFAULT_TIMEZONE, formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const dateKey = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);

const getEventRenderKey = (event: CalendarEvent, index: number) =>
  `${event.id}-${event.startsAt}-${event.endsAt ?? "open"}-${index}`;

const buildAgendaGroups = (events: CalendarEvent[]) => {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    timeZone: DEFAULT_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "short"
  });
  const dayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    day: "2-digit"
  });
  const todayKey = dateKey(new Date());
  const grouped = new Map<string, {
    key: string;
    label: string;
    dayNumber: number;
    isToday: boolean;
    events: CalendarEvent[];
  }>();

  events
    .slice()
    .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime())
    .forEach((event) => {
      const startsAt = new Date(event.startsAt);
      const key = dateKey(startsAt);
      const existing = grouped.get(key);

      if (existing) {
        existing.events.push(event);
        return;
      }

      grouped.set(key, {
        key,
        label: formatter.format(startsAt),
        dayNumber: Number(dayFormatter.format(startsAt)),
        isToday: key === todayKey,
        events: [event]
      });
    });

  return [...grouped.values()];
};

export default function MonthlySchedule({
  events,
  referenceDate
}: {
  events: CalendarEvent[];
  referenceDate: Date;
}) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const startDayIndex = (monthStart.getDay() + 6) % 7;
  const totalCells = Math.ceil((startDayIndex + daysInMonth) / 7) * 7;

  // Date math for navigation
  const prevMonthDate = new Date(year, month - 1, 1);
  const nextMonthDate = new Date(year, month + 1, 1);

  const formatMonth = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const prevMonthStr = formatMonth(prevMonthDate);
  const nextMonthStr = formatMonth(nextMonthDate);

  const eventsByDay = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const key = dateKey(new Date(event.startsAt));
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});
  const agendaGroups = buildAgendaGroups(events);

  const cells = Array.from({ length: totalCells }).map((_, index) => {
    const dayNumber = index - startDayIndex + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return dayNumber;
  });

  const todayKey = dateKey(new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="min-w-0 text-xl font-semibold capitalize leading-tight text-text">
          {referenceDate.toLocaleDateString("es-AR", {
            month: "long",
            year: "numeric"
          })}
        </h3>
        <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-surface-2/40 p-1 backdrop-blur-sm">
          <Link
            href={`?month=${prevMonthStr}`}
            prefetch={false}
            aria-label="Mes anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={`?month=${formatMonth(new Date())}`}
            prefetch={false}
            aria-label="Volver al mes actual"
            className="px-3 text-xs font-medium text-text transition-colors hover:text-accent focus:outline-none"
          >
            Hoy
          </Link>
          <Link
            href={`?month=${nextMonthStr}`}
            prefetch={false}
            aria-label="Mes siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="grid gap-3 md:hidden">
        {agendaGroups.length === 0 ? (
          <div className="rounded-[1.7rem] border border-border/50 bg-surface/65 px-5 py-8 text-center text-sm text-muted">
            No hay actividades registradas para este mes.
          </div>
        ) : (
          agendaGroups.map((group) => (
            <section
              key={group.key}
              className={cn(
                "overflow-hidden rounded-[1.7rem] border border-border/55 bg-surface/75 shadow-soft",
                group.isToday && "border-accent/35 ring-1 ring-accent/15"
              )}
            >
              <header className="flex items-center justify-between gap-3 border-b border-border/45 bg-surface-2/45 px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{group.label}</p>
                  <p className="mt-1 text-sm font-semibold text-text">
                    {group.events.length} evento{group.events.length === 1 ? "" : "s"}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
                    group.isToday
                      ? "bg-accent text-accent-content"
                      : "border border-border/55 bg-surface/85 text-text"
                  )}
                >
                  {group.dayNumber}
                </span>
              </header>
              <div className="divide-y divide-border/45">
                {group.events.map((event, index) => (
                  <article
                    key={getEventRenderKey(event, index)}
                    className="flex items-start gap-3 px-4 py-3"
                  >
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          event.color ??
                          (event.source === "calendar"
                            ? "rgb(var(--color-accent-2))"
                            : "rgb(var(--color-accent))")
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text">{event.title}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        {formatTime(event.startsAt)}
                        {event.endsAt ? ` - ${formatTime(event.endsAt)}` : ""}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-muted">
                        {event.subject ? `${event.subject} · ` : ""}
                        {event.source === "calendar" ? "Google Calendar" : "Plan interno"}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
      <div className="hidden grid-cols-7 gap-2 text-xs md:grid">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-[11px] font-medium tracking-wide text-muted uppercase">
              {day}
            </div>
          ))}
          {cells.map((cell, index) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[115px] rounded-2xl border border-dashed border-border/30 bg-surface/20"
                />
              );
            }
            const key = dateKey(new Date(Date.UTC(year, month, cell, 12)));
            const dayEvents = eventsByDay[key] ?? [];
            const isToday = key === todayKey;

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[115px] rounded-2xl border border-border/50 bg-surface/70 p-2 transition-colors hover:border-border",
                  isToday && "border-accent/40 bg-accent/5 ring-1 ring-inset ring-accent/20"
                )}
              >
                <div className="flex items-center justify-between px-1 text-[12px]">
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full font-medium",
                    isToday ? "bg-accent text-accent-content" : "text-text/80"
                  )}>
                    {cell}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5 text-[11px]">
                  {dayEvents.slice(0, 3).map((event, index) => (
                    <div key={getEventRenderKey(event, index)} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-surface-2/60 transition-colors">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            event.color ??
                            (event.source === "calendar"
                              ? "rgb(var(--color-accent-2))"
                              : "rgb(var(--color-accent))")
                        }}
                      />
                      <span className="truncate text-text/90 font-medium leading-none">{event.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 ? (
                    <div className="px-1 pt-1">
                      <span className="text-[10px] font-medium text-muted">
                        +{dayEvents.length - 3} más
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
