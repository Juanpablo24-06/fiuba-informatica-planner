"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { notifyCalendarPeriodChange } from "@/lib/calendar-motion";
import type { EnrollmentScheduleDay, Event, Term } from "@/lib/types";
import type { PlannerEntry } from "@/lib/planner/types";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";

const DAYS: { key: EnrollmentScheduleDay; label: string }[] = [
  { key: "lun", label: "Lun" },
  { key: "mar", label: "Mar" },
  { key: "mie", label: "Mié" },
  { key: "jue", label: "Jue" },
  { key: "vie", label: "Vie" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" }
];

const dayKeyForDate = (date: Date): EnrollmentScheduleDay =>
  DAYS[(date.getDay() + 6) % 7].key;

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime()) && value.includes("T")) {
    return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return value.slice(0, 5);
};

const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date);

const isEntryActiveOn = (entry: PlannerEntry, date: Date) => {
  const key = dateKey(date);
  return entry.effectiveFrom <= key && (!entry.effectiveTo || entry.effectiveTo >= key);
};

const isExamEvent = (event: Event) =>
  /exam|parcial|final|recup|evaluaci|entrega|tp/i.test(
    `${event.type} ${event.title ?? ""}`
  );

export type CalendarFilter = "all" | "subjects" | "exams";

export type CalendarPreviewItem = {
  id: string;
  date: Date;
  title: string;
  time: string;
  color: string | null;
  kind: "class" | "event";
  durationMinutes?: number;
};

export type CalendarViewModel = {
  entries: PlannerEntry[];
  events: Event[];
  upcoming: CalendarPreviewItem[][];
  metrics: {
    classes: number;
    subjects: number;
    hours: number;
  };
};

const buildMonthCells = (referenceDate: Date) => {
  const first = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const start = new Date(first);
  start.setHours(0, 0, 0, 0);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

const buildMonthItems = (
  entries: PlannerEntry[],
  events: Event[],
  referenceDate: Date
) => {
  const items: CalendarPreviewItem[] = [];
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = dateKey(date);

    entries.forEach((entry) => {
      if (!isEntryActiveOn(entry, date)) return;
      entry.slots
        .filter((slot) => slot.day === dayKeyForDate(date))
        .forEach((slot, index) => {
          items.push({
            id: `${entry.id}-${key}-${slot.start_time}-${index}`,
            date,
            title: entry.subjectName,
            time: slot.start_time,
            color: entry.color,
            kind: "class",
            durationMinutes: Math.max(
              0,
              Number(slot.end_time.slice(0, 2)) * 60 + Number(slot.end_time.slice(3, 5)) -
                Number(slot.start_time.slice(0, 2)) * 60 - Number(slot.start_time.slice(3, 5))
            )
          });
        });
    });
  }

  events.forEach((event) => {
    const date = new Date(event.starts_at);
    if (date.getFullYear() !== year || date.getMonth() !== month) return;
    items.push({
      id: event.id,
      date,
      title: event.title ?? event.type,
      time: formatTime(event.starts_at),
      color: event.enrollment?.color ?? null,
      kind: "event"
    });
  });

  return items.sort((first, second) => {
    const byDate = first.date.getTime() - second.date.getTime();
    return byDate || first.time.localeCompare(second.time);
  });
};

export const buildCalendarViewModel = ({
  entries,
  events,
  referenceDate,
  filter
}: {
  entries: PlannerEntry[];
  events: Event[];
  referenceDate: Date;
  filter: CalendarFilter;
}): CalendarViewModel => {
  const filteredEntries = filter === "exams" ? [] : entries;
  const filteredEvents = filter === "subjects"
    ? []
    : filter === "exams"
      ? events.filter(isExamEvent)
      : events;
  const allItems = buildMonthItems(entries, events, referenceDate);
  const filteredItems = buildMonthItems(filteredEntries, filteredEvents, referenceDate);
  const visibleItems = filteredItems.filter((item) => {
    if (filter === "subjects") return item.kind === "class";
    if (filter === "exams") return item.kind === "event";
    return true;
  });
  const classes = allItems.filter((item) => item.kind === "class");
  const subjectNames = new Set(classes.map((item) => item.title));
  const totalMinutes = classes.reduce((total, item) => total + (item.durationMinutes ?? 0), 0);
  const groups = new Map<string, CalendarPreviewItem[]>();
  visibleItems.forEach((item) => {
    const key = dateKey(item.date);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  });

  return {
    entries: filteredEntries,
    events: filteredEvents,
    upcoming: [...groups.entries()].filter(([key]) => key >= dateKey(new Date())).slice(0, 3).map(([, items]) => items),
    metrics: {
      classes: classes.length,
      subjects: subjectNames.size,
      hours: Math.round(totalMinutes / 60)
    }
  };
};

const metricIconClass = "h-4 w-4 text-accent";

function CalendarMetric({ icon, value, label }: { icon: ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 border-l border-border/40 pl-2 first:border-l-0 first:pl-0 sm:min-w-[5.5rem] sm:flex-none sm:gap-2 sm:pl-3 sm:first:pl-0">
      {icon}
      <div className="min-w-0">
        <p className="text-xs font-semibold leading-none text-text">{value}</p>
        <p className="mt-1 text-[9px] leading-tight uppercase tracking-[0.02em] text-muted">{label}</p>
      </div>
    </div>
  );
}

function CalendarMiniMonth({
  cells,
  referenceDate,
  onSelectDate
}: {
  cells: Date[];
  referenceDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const todayKey = dateKey(new Date());
  const referenceMonth = referenceDate.getMonth();
  return (
    <div className="border-t border-border/35 pt-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <button type="button" onClick={() => onSelectDate(new Date(referenceDate.getFullYear(), referenceMonth - 1, 1))} aria-label="Mes anterior" className="grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <p className="text-xs font-semibold capitalize text-text">{formatMonth(referenceDate)}</p>
        <button type="button" onClick={() => onSelectDate(new Date(referenceDate.getFullYear(), referenceMonth + 1, 1))} aria-label="Mes siguiente" className="grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {DAYS.map((day) => <span key={day.key} className="text-[10px] uppercase text-muted">{day.label.slice(0, 2)}</span>)}
        {cells.map((date) => {
          const isToday = dateKey(date) === todayKey;
          const isReferenceMonth = date.getMonth() === referenceMonth;
          const isSelected = dateKey(date) === dateKey(referenceDate);
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelectDate(date)}
              className={cn(
                "mx-auto grid h-6 w-6 place-items-center rounded-full text-[10px] transition hover:bg-accent/15 hover:text-text",
                !isReferenceMonth && "text-muted/40",
                isReferenceMonth && !isToday && !isSelected && "text-text/80",
                isToday && "bg-accent text-accent-content",
                isSelected && !isToday && "ring-1 ring-accent/65 text-accent"
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingList({ groups }: { groups: CalendarPreviewItem[][] }) {
  return (
    <div className="border-t border-border/35 pt-3">
      <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
        <CalendarDays className="h-3.5 w-3.5" />
        Próximos
      </div>
      <div className="space-y-2">
        {groups.length === 0 ? <p className="px-1 py-3 text-[10px] text-muted">No hay actividades en este filtro.</p> : groups.map((group) => {
          const date = group[0].date;
          return (
            <div key={dateKey(date)} className="rounded-xl border border-border/35 bg-surface-2/35 px-2.5 py-2.5">
              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                <span>{new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(date)}</span>
                <span>{new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(date)}</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {group.slice(0, 3).map((item) => <div key={item.id} className="flex min-w-0 items-center gap-2 text-[11px] text-muted"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" style={item.color ? { backgroundColor: item.color } : undefined} /><span className="w-8 shrink-0 font-mono text-[10px] text-muted/80">{formatTime(item.time)}</span><span className="min-w-0 truncate text-text/85">{item.title}</span></div>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarWorkspaceShell({
  term,
  terms,
  cells,
  referenceDate,
  filter,
  metrics,
  upcoming,
  view,
  onSelectTerm,
  onSelectDate,
  onToday,
  onShift,
  onFilterChange,
  onViewChange,
  children
}: {
  term: Term | null;
  terms: Term[];
  cells: Date[];
  referenceDate: Date;
  filter: CalendarFilter;
  metrics: CalendarViewModel["metrics"];
  upcoming: CalendarPreviewItem[][];
  view: "week" | "month";
  onSelectTerm: (termId: string) => void;
  onSelectDate: (date: Date) => void;
  onToday: () => void;
  onShift: (amount: number) => void;
  onFilterChange: (filter: CalendarFilter) => void;
  onViewChange: (view: "week" | "month") => void;
  children: ReactNode;
}) {
  const month = referenceDate.getFullYear() * 12 + referenceDate.getMonth();
  const previousMonth = useRef(month);
  useEffect(() => {
    notifyCalendarPeriodChange(previousMonth.current, month);
    previousMonth.current = month;
  }, [month]);

  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-[228px_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-[1.1rem] border border-border/45 bg-surface/80 px-3 py-3 backdrop-blur-xl lg:sticky lg:top-[calc(var(--app-header-height,96px)+0.65rem)] lg:self-start">
        <Select aria-label="Cuatrimestre" value={term?.id ?? ""} onChange={(event) => onSelectTerm(event.target.value)} className="rounded-xl border-border/45 bg-surface-2/50 px-3 py-2 text-xs">
          {terms.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>
        <div className="hidden lg:block"><CalendarMiniMonth cells={cells} referenceDate={referenceDate} onSelectDate={onSelectDate} /></div>
        <div className="mt-3 flex gap-1.5 border-t border-border/35 pt-3">
          {(["all", "subjects", "exams"] as const).map((item) => {
            const label = item === "all" ? "Todos" : item === "subjects" ? "Materias" : "Exámenes";
            return <button key={item} type="button" onClick={() => onFilterChange(item)} aria-pressed={filter === item} className={cn("min-w-0 flex-1 rounded-full border px-2 py-1.5 text-[11px] font-semibold transition", filter === item ? "border-accent bg-accent text-accent-content" : "border-border/45 text-muted hover:border-accent/45 hover:text-text")}>{label}</button>;
          })}
        </div>
        <div className="hidden lg:block"><UpcomingList groups={upcoming} /></div>
        <Link href="/cursos" className="mt-3 flex items-center justify-between border-t border-border/35 px-1 pt-3 text-[10px] font-semibold text-muted transition hover:text-accent">
          <span className="inline-flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" />Administrar materias</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </aside>

      <section className="min-w-0 space-y-3">
        <header className="sticky top-[calc(var(--app-header-height,96px)+0.65rem)] z-20 flex min-w-0 flex-wrap items-center gap-3 rounded-[1.1rem] border border-border/45 bg-surface/90 px-3 py-2.5 backdrop-blur-xl sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => onShift(-1)} aria-label={view === "month" ? "Mes anterior" : "Período anterior"} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2/55 text-muted transition hover:bg-accent/10 hover:text-accent"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={onToday} className="h-8 rounded-lg bg-surface-2/55 px-2.5 text-[10px] font-semibold text-muted transition hover:bg-accent/10 hover:text-accent">Hoy</button>
            <button type="button" onClick={() => onShift(1)} aria-label={view === "month" ? "Mes siguiente" : "Período siguiente"} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2/55 text-muted transition hover:bg-accent/10 hover:text-accent"><ChevronRight className="h-4 w-4" /></button>
            <h1 className="ml-1 truncate text-lg font-semibold capitalize tracking-tight text-text sm:text-xl">{formatMonth(referenceDate)}</h1>
          </div>
          <div className="order-3 flex w-full flex-col gap-2 border-t border-border/35 pt-2 sm:order-none sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:border-t-0 sm:pt-0">
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <CalendarMetric icon={<CalendarDays className={metricIconClass} />} value={metrics.classes} label="clases este mes" />
              <CalendarMetric icon={<BookOpen className={metricIconClass} />} value={metrics.subjects} label="materias activas" />
              <CalendarMetric icon={<Clock3 className={metricIconClass} />} value={`${metrics.hours} h`} label="carga mensual" />
            </div>
            <div className="flex shrink-0 self-end rounded-lg bg-surface-2/55 p-0.5 sm:self-auto">
              {(["week", "month"] as const).map((item) => <button key={item} type="button" onClick={() => onViewChange(item)} aria-pressed={view === item} className={cn("rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition", view === item ? "bg-accent text-accent-content" : "text-muted hover:text-text")}>{item === "week" ? "Semana" : "Mes"}</button>)}
            </div>
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}

export function CalendarMonthGrid({
  entries,
  events,
  cells,
  referenceDate,
  onSelectDate
}: {
  entries: PlannerEntry[];
  events: Event[];
  cells: Date[];
  referenceDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const todayKey = dateKey(new Date());
  const month = referenceDate.getMonth();
  return (
    <section className="overflow-hidden rounded-[1.1rem] border border-border/45 bg-surface/70">
      <div className="grid grid-cols-7 border-b border-border/40 bg-surface/80">
        {DAYS.map((day) => <div key={day.key} className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted sm:px-2 sm:text-[11px]">{day.label}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date) => {
          const isToday = dateKey(date) === todayKey;
          const isCurrentMonth = date.getMonth() === month;
          const dayEvents = events.filter((event) => dateKey(new Date(event.starts_at)) === dateKey(date));
          const dayClasses = entries.flatMap((entry) => {
            if (!isEntryActiveOn(entry, date)) return [];
            return entry.slots.filter((slot) => slot.day === dayKeyForDate(date)).map((slot, index) => ({ id: `${entry.id}-${slot.start_time}-${index}`, title: entry.subjectName, time: slot.start_time, color: entry.color }));
          });
          const items = [...dayClasses, ...dayEvents.map((event) => ({ id: event.id, title: event.title ?? event.type, time: formatTime(event.starts_at), color: event.enrollment?.color ?? null }))].sort((first, second) => first.time.localeCompare(second.time));
          return (
            <button key={date.toISOString()} type="button" onClick={() => onSelectDate(date)} aria-label={`Ver ${formatMonth(date)} ${date.getDate()}`} className={cn("group min-h-[84px] min-w-0 border-b border-r border-border/30 bg-surface/20 p-1.5 text-left transition hover:bg-accent/[0.04] sm:min-h-[112px] sm:p-2.5", !isCurrentMonth && "bg-surface/5 text-muted/45") }>
              <span className={cn("grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold transition sm:h-7 sm:w-7 sm:text-[11px]", isToday ? "bg-accent text-accent-content" : isCurrentMonth ? "text-text" : "text-muted/45", !isToday && "group-hover:bg-accent/10 group-hover:text-accent")}>{date.getDate()}</span>
              <span className="mt-2 block space-y-1">
                {items.slice(0, 3).map((item) => <span key={item.id} className="flex min-w-0 items-center gap-1 rounded-md bg-surface-2/55 px-1.5 py-1 text-[10px] leading-none text-text/85 sm:text-[11px]"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" style={item.color ? { backgroundColor: item.color } : undefined} /><span className="shrink-0 font-mono text-[7px] text-muted sm:text-[10px]">{formatTime(item.time)}</span><span className="min-w-0 truncate">{item.title}</span></span>)}
                {items.length > 3 ? <span className="block px-1 text-[10px] font-semibold text-accent">+{items.length - 3} más</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export { buildMonthCells };
