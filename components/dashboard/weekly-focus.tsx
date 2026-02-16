import type { CalendarEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/date";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS: Record<string, string> = {
  tp: "TPs",
  parcial: "Parciales",
  recuperatorio: "Recup",
  final: "Finales",
  clase: "Clases",
  class: "Clases",
  exam: "Parciales",
  meeting: "Reuniones",
  other: "Otros"
};

export default function WeeklyFocus({ events }: { events: CalendarEvent[] }) {
  const now = new Date();
  const upcoming = [...events]
    .filter((event) => new Date(event.startsAt).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const nextEvent = upcoming[0];

  const typeCounts = events.reduce<Record<string, number>>((acc, event) => {
    const key = event.type ?? "other";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const subjectCounts = events.reduce<Record<string, number>>((acc, event) => {
    if (!event.subject) return acc;
    acc[event.subject] = (acc[event.subject] ?? 0) + 1;
    return acc;
  }, {});

  const topSubjects = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/60 bg-surface/80 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Próximo</p>
        {nextEvent ? (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-semibold text-text">{nextEvent.title}</p>
            <p className="text-xs text-muted">
              {nextEvent.subject ? `${nextEvent.subject} · ` : ""}
              {formatDateTime(nextEvent.startsAt)}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Sin eventos en la semana.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-surface/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Carga semanal</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="bg-surface-2/70 text-muted">
              Total {events.length}
            </Badge>
            {Object.entries(typeCounts)
              .filter(([, count]) => count > 0)
              .map(([type, count]) => (
                <Badge key={type} className="bg-surface-2/70 text-muted">
                  {(TYPE_LABELS[type] ?? type)} {count}
                </Badge>
              ))}
          </div>
        </div>
        <div className="rounded-3xl border border-border/60 bg-surface/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Materias activas</p>
          <div className="mt-3 space-y-2 text-xs text-muted">
            {topSubjects.length ? (
              topSubjects.map(([subject, count]) => (
                <div key={subject} className="flex items-center justify-between">
                  <span className="text-text">{subject}</span>
                  <span>{count} eventos</span>
                </div>
              ))
            ) : (
              <p>Sin actividad registrada esta semana.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
