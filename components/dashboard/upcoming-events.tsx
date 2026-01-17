"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/date";

export default function UpcomingEvents({
  events,
  subjectOptions
}: {
  events: CalendarEvent[];
  subjectOptions: string[];
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={subjectFilter}
          onChange={(event) => setSubjectFilter(event.target.value)}
          className="rounded-full border border-border/60 bg-canvas/80 px-3 py-1.5 text-xs text-text"
        >
          <option value="all">Todas las materias</option>
          {subjectOptions.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-full border border-border/60 bg-canvas/80 px-3 py-1.5 text-xs text-text"
        >
          <option value="all">Todos los tipos</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted">No hay eventos próximos con esos filtros.</p>
        ) : (
          filtered.map((event) => (
            <div
              key={event.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-surface/70 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-semibold">{event.title}</p>
                <p className="text-xs text-muted">
                  {event.subject ? `${event.subject} · ` : ""}
                  {event.type ? `${event.type} · ` : ""}
                  {event.source === "calendar" ? "Google Calendar" : "Plan interno"}
                </p>
              </div>
              <div className="text-xs text-muted">{formatDateTime(event.startsAt)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
