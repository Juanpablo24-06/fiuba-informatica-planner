"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/types";
import { DEFAULT_TIMEZONE, formatDateTime, formatTime } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import type { EvaluationSection } from "@/lib/dashboard/evaluation-classification";
import { cn } from "@/lib/utils";

const getEventRenderKey = (event: CalendarEvent, index: number) =>
  `${event.id}-${event.startsAt}-${event.endsAt ?? "open"}-${index}`;

export default function UpcomingEvents({
  events,
  subjectOptions,
  compactByDay = false,
  sections
}: {
  events: CalendarEvent[];
  subjectOptions: string[];
  compactByDay?: boolean;
  sections?: EvaluationSection[];
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

  if (sections?.length) {
    return (
      <div className="space-y-5">
        {sections.map((section) => (
          <section key={section.key} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                {section.label}
              </p>
              <p className="text-[11px] text-muted">
                {section.events.length} {section.events.length === 1 ? "evento" : "eventos"}
              </p>
            </div>
            <div className="border-t border-border/30 divide-y divide-border/35">
              {section.events.map((event, index) => (
                <article
                  key={getEventRenderKey(event, index)}
                  className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-transparent"
                      style={{
                        backgroundColor:
                          event.color ??
                          (event.source === "calendar"
                            ? "rgb(var(--color-accent-2))"
                            : "rgb(var(--color-accent))")
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{event.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {event.subject ? `${event.subject} · ` : ""}
                        {event.type ? `${event.type} · ` : ""}
                        {event.source === "calendar" ? "Google Calendar" : "Plan interno"}
                      </p>
                      {event.tags?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {event.tags.slice(0, 2).map((tag, tagIndex) => (
                            <span
                              key={`${event.id}-${tag}-${tagIndex}`}
                              className="rounded-full border border-border/50 bg-surface/60 px-2 py-0.5 text-[10px] font-medium text-muted"
                            >
                              {tag}
                            </span>
                          ))}
                          {event.tags.length > 2 ? (
                            <span className="rounded-full border border-border/40 bg-surface/50 px-2 py-0.5 text-[10px] font-medium text-muted">
                              +{event.tags.length - 2}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold text-muted">{formatDateTime(event.startsAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
          <option value="all">Todas las materias</option>
          {subjectOptions.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </Select>
        <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
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
            <section key={key} className="space-y-2 border-t border-border/35 pt-3">
              <header className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {group.label}
                </p>
                <p className="text-[11px] text-muted">
                  {group.events.length} {group.events.length === 1 ? "evento" : "eventos"}
                </p>
              </header>
              <div className="border-t border-border/30 divide-y divide-border/35">
                {group.events.map((event, index) => (
                  <article
                    key={getEventRenderKey(event, index)}
                    className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-transparent"
                        style={{
                          backgroundColor:
                            event.color ??
                            (event.source === "calendar"
                              ? "rgb(var(--color-accent-2))"
                              : "rgb(var(--color-accent))")
                        }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">{event.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {event.subject ? `${event.subject} · ` : ""}
                          {event.type ? `${event.type} · ` : ""}
                          {event.source === "calendar" ? "Google Calendar" : "Plan interno"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold text-muted">{formatTime(event.startsAt)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        ) : (
          filtered.map((event, index) => (
            <div
              key={getEventRenderKey(event, index)}
              className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-surface/75 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
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
                    {event.tags.map((tag, tagIndex) => (
                      <Badge key={`${event.id}-${tag}-${tagIndex}`} className="bg-surface-2/70 text-muted">
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
