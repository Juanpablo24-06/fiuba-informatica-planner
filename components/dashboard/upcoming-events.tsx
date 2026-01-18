"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

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
        ) : (
          filtered.map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-3 rounded-3xl border border-white/[0.12] bg-surface/80 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
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
                      <Badge key={tag} className="bg-white/[0.04] text-muted">
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
