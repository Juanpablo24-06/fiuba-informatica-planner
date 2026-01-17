"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { EvaluationTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type MapNode = {
  id: string;
  name: string;
  code: string | null;
  term: number | null;
  type: string | null;
  status?: string | null;
  color?: string | null;
  requirements?: string[] | null;
  credits?: number | null;
  weekly_hours?: number | null;
  total_hours?: number | null;
  template?: EvaluationTemplate | null;
};

export type MapEdge = {
  from: string;
  to: string;
};

const STATUS_STYLES: Record<string, string> = {
  cursando: "border-accent/60 text-accent",
  final_pendiente: "border-warning/60 text-warning",
  aprobado: "border-success/60 text-success",
  recursar: "border-danger/60 text-danger"
};

const TERMS = Array.from({ length: 10 }, (_, index) => index + 1);

const formatTemplate = (template?: EvaluationTemplate | null) => {
  if (!template) return "Sin plantilla";
  return Object.entries(template)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
};

export default function MapView({ nodes, edges }: { nodes: MapNode[]; edges: MapEdge[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([]);

  const grouped = useMemo(() => {
    const map = new Map<number, MapNode[]>();
    TERMS.forEach((term) => map.set(term, []));
    nodes.forEach((node) => {
      const term = node.term ?? 0;
      if (!map.has(term)) map.set(term, []);
      map.get(term)?.push(node);
    });
    map.forEach((value, key) => {
      value.sort((a, b) => a.name.localeCompare(b.name));
      if (key === 0) {
        value.sort((a, b) => a.name.localeCompare(b.name));
      }
    });
    return map;
  }, [nodes]);

  const prerequisitesByNode = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const map = new Map<string, string[]>();
    edges.forEach((edge) => {
      const prereq = byId.get(edge.from);
      if (!prereq) return;
      const list = map.get(edge.to) ?? [];
      list.push(prereq.name);
      list.sort((a, b) => a.localeCompare(b));
      map.set(edge.to, list);
    });
    return map;
  }, [edges, nodes]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const compute = () => {
      const nodeEls = Array.from(
        container.querySelectorAll<HTMLElement>("[data-node-id]")
      );
      const positions = new Map<string, DOMRect>();
      const containerRect = container.getBoundingClientRect();
      nodeEls.forEach((el) => {
        positions.set(el.dataset.nodeId ?? "", el.getBoundingClientRect());
      });

      const nextLines = edges
        .map((edge) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          return {
            x1: from.right - containerRect.left,
            y1: from.top - containerRect.top + from.height / 2,
            x2: to.left - containerRect.left,
            y2: to.top - containerRect.top + to.height / 2
          };
        })
        .filter(Boolean) as Array<{ x1: number; y1: number; x2: number; y2: number }>;

      setLines(nextLines);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    window.addEventListener("resize", compute);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [edges, nodes]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0">
        <svg className="h-full w-full">
          {lines.map((line, index) => (
            <line
              key={`line-${index}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(148, 163, 184, 0.35)"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>
      <div ref={containerRef} className="grid gap-6 md:grid-cols-5 lg:grid-cols-10">
        {TERMS.map((term) => (
          <div key={term} className="space-y-3">
            <div className="rounded-full border border-border/60 bg-surface/80 px-3 py-1 text-xs text-muted">
              Cuatri {term}
            </div>
            <div className="space-y-3">
              {(grouped.get(term) ?? []).map((node) => (
                <Dialog key={node.id}>
                  <DialogTrigger asChild>
                    <button
                      data-node-id={node.id}
                      className={cn(
                        "w-full rounded-2xl border bg-surface/70 px-3 py-2 text-left text-xs font-semibold text-text shadow-tile transition hover:border-accent/60",
                        node.status ? STATUS_STYLES[node.status] : "border-border/60"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{node.name}</span>
                        {node.color ? (
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: node.color }}
                          />
                        ) : null}
                      </div>
                      <span className="text-[10px] text-muted">{node.code ?? "Sin código"}</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{node.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 text-sm text-muted">
                      <p>
                        Código: <span className="text-text">{node.code ?? "N/A"}</span>
                      </p>
                      <p>
                        Créditos: <span className="text-text">{node.credits ?? "-"}</span>
                      </p>
                      <p>
                        Horas: <span className="text-text">{node.total_hours ?? "-"}</span>
                      </p>
                      <p>
                        Estado: <span className="text-text">{node.status ?? "Sin estado"}</span>
                      </p>
                      <p>
                        Requisitos:{" "}
                        <span className="text-text">
                          {node.requirements?.join(" · ") ?? "Sin requisitos"}
                        </span>
                      </p>
                      <p>
                        Correlativas:{" "}
                        <span className="text-text">
                          {prerequisitesByNode.get(node.id)?.join(" · ") ??
                            "Sin correlativas"}
                        </span>
                      </p>
                      <p>
                        Plantilla: <span className="text-text">{formatTemplate(node.template)}</span>
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
