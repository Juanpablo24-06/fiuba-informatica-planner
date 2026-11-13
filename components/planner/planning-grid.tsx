"use client";

import { useRef, useState } from "react";
import type { PlanningActivity, PlanningBlock, PlanningSelection } from "@/components/planner/planning-types";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 15 }, (_, index) => index + 7);
const CLASS_LABEL: Record<string, string> = { theory: "T", practice: "P", laboratory: "L", consultation: "C", other: "" };
const timeMinutes = (value: string) => { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; };
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

type GridItem = { id: string; title: string; subtitle: string; block: PlanningBlock; color: string; personal?: boolean; activity?: PlanningActivity };
type PositionedItem = GridItem & { column: number; columns: number };

const layoutDayBlocks = (items: GridItem[], day: string): PositionedItem[] => {
  const source = items.filter((item) => item.block.day === day).sort((a, b) => timeMinutes(a.block.start_time) - timeMinutes(b.block.start_time));
  const result: PositionedItem[] = [];
  let cluster: GridItem[] = [];
  let clusterEnd = -1;
  const flush = () => {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const assigned = cluster.map((item) => {
      const start = timeMinutes(item.block.start_time);
      let column = columnEnds.findIndex((end) => end <= start);
      if (column < 0) column = columnEnds.length;
      columnEnds[column] = timeMinutes(item.block.end_time);
      return { ...item, column };
    });
    const columns = Math.max(1, columnEnds.length);
    result.push(...assigned.map((item) => ({ ...item, columns })));
    cluster = [];
    clusterEnd = -1;
  };
  source.forEach((item) => {
    const start = timeMinutes(item.block.start_time);
    if (cluster.length && start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, timeMinutes(item.block.end_time));
  });
  flush();
  return result;
};

type Props = {
  readOnly?: boolean;
  selections: PlanningSelection[];
  activities: PlanningActivity[];
  weekDays: { key: string; label: string; date: Date }[];
  hourHeight: number;
  onCreateActivity: (value: { day: string; start: string; end: string }) => void;
  onSelectActivity?: (activity: PlanningActivity) => void;
};

export default function PlanningGrid({ readOnly = false, selections, activities, weekDays, hourHeight, onCreateActivity, onSelectActivity }: Props) {
  const [drag, setDrag] = useState<{ day: string; start: number; end: number } | null>(null);
  const dragRef = useRef<{ day: string; start: number; end: number } | null>(null);
  const selectionItems = selections.flatMap((selection) => selection.blocks.map((block, index) => ({
    id: `${selection.id}-${index}`,
    title: selection.subjectName,
    subtitle: `${selection.commissionNames?.join(" · ") || selection.commissionName || selection.subjectCode || "Sin comisión"}${block.location ? ` · ${block.location}` : ""}`,
    block,
    color: selection.color
  })));
  const activityItems = activities.flatMap((activity) => activity.blocks.map((block, index) => ({
    id: `${activity.id}-${index}`,
    title: activity.title,
    subtitle: `${activity.kind}${activity.location ? ` · ${activity.location}` : ""}`,
    block,
    color: activity.color,
    personal: true,
    activity
  })));
  const items = [...selectionItems, ...activityItems];
  const gridTemplateColumns = `52px repeat(${weekDays.length}, minmax(0, 1fr))`;
  const startDrag = (day: string, hour: number) => {
    if (readOnly) return;
    const next = { day, start: hour * 60, end: (hour + 1) * 60 };
    dragRef.current = next;
    setDrag(next);
  };
  const updateDrag = (day: string, hour: number) => {
    if (!dragRef.current || dragRef.current.day !== day) return;
    const end = Math.max((hour + 1) * 60, dragRef.current.start + 30);
    const next = { ...dragRef.current, end };
    dragRef.current = next;
    setDrag(next);
  };
  const finishDrag = () => {
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!current || readOnly) return;
    onCreateActivity({ day: current.day, start: toTime(current.start), end: toTime(current.end) });
  };

  return (
    <section data-temporal-grid="planning" data-visible-days={weekDays.length} className="h-[calc(100dvh-var(--app-header-height,160px)-9.5rem)] min-h-[420px] overflow-hidden rounded-[1.6rem] border border-border/45 bg-surface/70 lg:h-[calc(100dvh-var(--app-header-height,96px)-5.5rem)]">
      <div className="context-scrollbar h-full overflow-y-auto overscroll-contain">
        <div className="grid" style={{ gridTemplateColumns }}>
          <div className="sticky top-0 z-30 border-b border-r border-border/30 bg-surface/95 p-2 text-[8px] uppercase tracking-[0.12em] text-muted backdrop-blur">GMT-3</div>
          {weekDays.map((day) => <div key={day.key} className="sticky top-0 z-30 border-b border-border/30 bg-surface/95 px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted backdrop-blur"><span>{day.label}</span><span className="ml-1 text-muted/60">{day.date.getDate()}</span></div>)}
          <div className="relative border-r border-border/30">{HOURS.map((hour) => <div key={hour} className="border-b border-border/20 px-1.5 pt-1 text-right text-[8px] text-muted" style={{ height: hourHeight }}>{String(hour).padStart(2, "0")}:00</div>)}</div>
          {weekDays.map((day) => {
            const positioned = layoutDayBlocks(items, day.key);
            return (
              <div key={day.key} className="relative border-r border-border/20 bg-surface/20 last:border-r-0" onPointerUp={finishDrag}>
                {HOURS.map((hour) => {
                  const selected = drag?.day === day.key && drag.start <= hour * 60 && drag.end > hour * 60;
                  return <button key={hour} type="button" disabled={readOnly} data-grid-slot={`${day.key}-${hour}`} aria-label={`Crear actividad el ${day.label} a las ${String(hour).padStart(2, "0")}:00`} className={cn("absolute inset-x-0 z-0 w-full border-b border-border/20 text-left transition-colors hover:bg-accent/[0.045] focus-visible:z-10 focus-visible:bg-accent/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent", selected && "bg-accent/10")} style={{ top: (hour - 7) * hourHeight, height: hourHeight }} onKeyDown={(event) => { if (!readOnly && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onCreateActivity({ day: day.key, start: toTime(hour * 60), end: toTime((hour + 1) * 60) }); } }} onPointerDown={() => startDrag(day.key, hour)} onPointerEnter={() => updateDrag(day.key, hour)} />;
                })}
                {positioned.map((item) => {
                  const top = (timeMinutes(item.block.start_time) - 7 * 60) / 60 * hourHeight;
                  const height = Math.max(36, (timeMinutes(item.block.end_time) - timeMinutes(item.block.start_time)) / 60 * hourHeight);
                  const width = 100 / item.columns;
                  return <button key={item.id} type="button" onClick={() => item.activity && !readOnly && onSelectActivity?.(item.activity)} className={cn("absolute z-10 overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1.5 text-left text-[9px] transition hover:brightness-110 sm:rounded-xl sm:px-2", item.personal ? "border-dashed bg-surface-2/75" : "bg-accent/12", item.activity && "cursor-pointer")} style={{ top, height, left: `calc(${item.column * width}% + 3px)`, width: `calc(${width}% - 6px)`, borderColor: item.color }}>
                    <div className="flex items-start gap-1"><span className={cn("mt-px rounded px-1 text-[8px] font-bold", item.personal ? "bg-accent-2/15 text-accent-2" : "bg-surface/70 text-accent")}>{item.personal ? "P" : CLASS_LABEL[item.block.class_type ?? "other"]}</span><span className="min-w-0 truncate font-semibold text-text">{item.title}</span></div>
                    <p className="mt-0.5 truncate text-muted">{item.subtitle}</p>
                    <p className="text-muted">{item.block.start_time}–{item.block.end_time}</p>
                  </button>;
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
