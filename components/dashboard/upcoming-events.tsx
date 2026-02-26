"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/types";
import { DEFAULT_TIMEZONE, formatDateTime, formatTime } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

export default function UpcomingEvents({
  events,
  subjectOptions,
  compactByDay = false
}: {
  events: CalendarEvent[];
  subjectOptions: string[];
  compactByDay?: boolean;
}) {
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return events
      .filter((event) => {
        if (subjectFilter !== "all" && event.subject !== subjectFilter) return false;
        if (typeFilter !== "all" && event.type !== typeFilter) return false;
        return true;
      })
      .sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      );
  }, [events, subjectFilter, typeFilter]);

  const types = Array.from(
    new Set(events.map((event) => event.type).filter(Boolean))
  ) as string[];
  const groupedByDay = useMemo(() => {
    const map = new Map<string, { label: string; events: CalendarEvent[] }>();
    for (const event of filtered) {
      const date = new Date(event.startsAt);
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: DEFAULT_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(date);
      const label = new Intl.DateTimeFormat("es-AR", {
        timeZone: DEFAULT_TIMEZONE,
        weekday: "long",
        day: "2-digit",
        month: "short"
      }).format(date);
      const group = map.get(key);
      if (!group) {
        map.set(key, { label, events: [event] });
        continue;
      }
      group.events.push(event);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          value={subjectFilter}
          onChange={(event) => setSubjectFilter(event.target.value)}
        >
          <option value="all">Todas las materias</option>
          {subjectOptions.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </Select>
        <Select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="all">Todos los tipos</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted">No hay eventos próximos con esos filtros.</p>
        ) : compactByDay ? (
          groupedByDay.map(([key, group]) => (
            <section
              key={key}
              className="overflow-hidden rounded-2xl border border-border/60 bg-surface/80"
            >
              <header className="border-b border-border/50 bg-surface-2/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                {group.label}
              </header>
              <div className="divide-y divide-border/45">
                {group.events.map((event) => (
                  <article
                    key={event.id}
                    className="flex items-start justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{event.title}</p>
                      <p className="truncate text-[11px] text-muted">
                        {event.subject ? `${event.subject} · ` : ""}
                        {event.type ? `${event.type} · ` : ""}
                        {event.source === "calendar" ? "Google Calendar" : "Plan interno"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold text-muted">{formatTime(event.startsAt)}</p>
                      {event.tags?.[0] ? (
                        <p className="mt-1 text-[10px] text-muted">{event.tags[0]}</p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        ) : (
          filtered.map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-surface/80 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold">{event.title}</p>
                <p className="text-xs text-muted">
                  {event.subject ? `${event.subject} · ` : ""}
                  {event.type ? `${event.type} · ` : ""}
                  {event.source === "calendar" ? "Google Calendar" : "Plan interno"}
                </p>
                {event.tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <Badge key={tag} className="bg-surface-2/70 text-muted">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="text-xs text-muted">{formatDateTime(event.startsAt)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
