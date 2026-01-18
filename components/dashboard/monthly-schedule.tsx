import type { CalendarEvent } from "@/lib/types";
import { DEFAULT_TIMEZONE } from "@/lib/date";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const dateKey = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);

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

  const eventsByDay = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const key = dateKey(new Date(event.startsAt));
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  const cells = Array.from({ length: totalCells }).map((_, index) => {
    const dayNumber = index - startDayIndex + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return dayNumber;
  });

  const todayKey = dateKey(new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Vista mensual</span>
        <span>
          {referenceDate.toLocaleDateString("es-AR", {
            month: "long",
            year: "numeric"
          })}
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-7 gap-2 text-xs">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-[11px] text-muted">
              {day}
            </div>
          ))}
          {cells.map((cell, index) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[110px] rounded-2xl border border-dashed border-white/[0.08] bg-transparent"
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
                  "min-h-[110px] rounded-2xl border border-white/[0.12] bg-surface/80 p-2",
                  isToday && "border-accent/60 bg-accent/10"
                )}
              >
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span className={cn("font-semibold", isToday && "text-text")}>
                    {cell}
                  </span>
                  <span>{dayEvents.length ? `${dayEvents.length} evt` : ""}</span>
                </div>
                <div className="mt-2 space-y-1 text-[10px] text-muted">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="flex items-center gap-1">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            event.color ??
                            (event.source === "calendar"
                              ? "rgb(var(--color-accent-2))"
                              : "rgb(var(--color-accent))")
                        }}
                      />
                      <span className="truncate text-text">{event.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 ? (
                    <span className="text-[10px] text-muted">
                      +{dayEvents.length - 3} más
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
