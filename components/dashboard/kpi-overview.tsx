"use client";

import { Activity, FileText, Target, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, string> = {
  cursando: "Cursando",
  final_pendiente: "Final pendiente",
  aprobado: "Aprobado",
  recursar: "Recursar"
};

type GradeItem = {
  id: string;
  title: string;
  subject?: string | null;
  date: string;
  grade: number | null;
};

type CreditItem = {
  id: string;
  name: string;
  credits: number | null;
};

type EfficiencyItem = {
  id: string;
  name: string;
  status: string;
};

type FinalItem = {
  id: string;
  title: string;
  subject?: string | null;
  date: string;
  grade: number | null;
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  delay = 0
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof Trophy;
  delay?: number;
}) => (
  <Card
    className="animate-fade-in transition hover:scale-[1.02]"
    style={delay ? { animationDelay: `${delay}ms` } : undefined}
  >
    <CardBody className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">{title}</p>
        <p className="text-2xl font-semibold text-text font-display">{value}</p>
        {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/40 bg-accent/10 text-accent">
        <Icon className="h-6 w-6" strokeWidth={1.6} />
      </div>
    </CardBody>
  </Card>
);

const EmptyState = ({ label }: { label: string }) => (
  <p className="text-sm text-muted">{label}</p>
);

export default function KpiOverview({
  average,
  grades,
  creditsTotal,
  credits,
  efficiency,
  efficiencyItems,
  finalsTotal,
  finals
}: {
  average: string;
  grades: GradeItem[];
  creditsTotal: number;
  credits: CreditItem[];
  efficiency: string;
  efficiencyItems: EfficiencyItem[];
  finalsTotal: number;
  finals: FinalItem[];
}) {
  const gradeValues = grades.map((item) => item.grade).filter((grade) => grade !== null) as number[];
  const gradeSum = gradeValues.reduce((sum, value) => sum + value, 0);
  const gradeCount = gradeValues.length;
  const gradeAverage = gradeCount ? (gradeSum / gradeCount).toFixed(1) : "--";

  const approvedCount = efficiencyItems.filter((item) => item.status === "aprobado").length;

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className="w-full text-left">
            <StatCard
              title="Promedio"
              value={average}
              subtitle="Notas registradas"
              icon={Trophy}
              delay={40}
            />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promedio de evaluaciones</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted">
            <div className="rounded-2xl border border-border/60 bg-surface/80 px-4 py-3">
              <p>
                {gradeCount ? `Suma ${gradeSum} / ${gradeCount} notas` : "Sin notas registradas"} ·{" "}
                <span className="text-text font-semibold">Promedio {gradeAverage}</span>
              </p>
            </div>
            {grades.length ? (
              <div className="space-y-2">
                {grades.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/45 bg-surface/80 px-4 py-3"
                  >
                    <p className="font-semibold text-text">
                      {item.title} · {item.subject ?? "Materia"}
                    </p>
                    <p className="text-xs text-muted">
                      {item.date} · {item.grade !== null ? `Nota ${item.grade}` : "Sin nota"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="Todavía no hay notas cargadas." />
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Listo
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className="w-full text-left">
            <StatCard
              title="Créditos"
              value={`${creditsTotal}`}
              subtitle="Activos este cuatri"
              icon={Target}
              delay={80}
            />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créditos activos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted">
            <div className="rounded-2xl border border-border/60 bg-surface/80 px-4 py-3">
              Total activo: <span className="text-text font-semibold">{creditsTotal}</span>
            </div>
            {credits.length ? (
              <div className="space-y-2">
                {credits.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-border/45 bg-surface/80 px-4 py-3"
                  >
                    <span className="font-semibold text-text">{item.name}</span>
                    <Badge className="bg-surface-2/70 text-muted">
                      {item.credits ?? 0} cr
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No hay materias activas todavía." />
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Listo
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className="w-full text-left">
            <StatCard
              title="Eficiencia"
              value={efficiency}
              subtitle="Materias aprobadas"
              icon={Activity}
              delay={120}
            />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eficiencia del cuatrimestre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted">
            <div className="rounded-2xl border border-border/60 bg-surface/80 px-4 py-3">
              {efficiencyItems.length ? (
                <p>
                  {approvedCount} de {efficiencyItems.length} materias aprobadas ·{" "}
                  <span className="text-text font-semibold">{efficiency}</span>
                </p>
              ) : (
                <p>Sin materias activas todavía.</p>
              )}
            </div>
            {efficiencyItems.length ? (
              <div className="space-y-2">
                {efficiencyItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-border/45 bg-surface/80 px-4 py-3"
                  >
                    <span className="font-semibold text-text">{item.name}</span>
                    <span className="text-xs text-muted">
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No hay estados para calcular todavía." />
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Listo
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className="w-full text-left">
            <StatCard
              title="Finales"
              value={`${finalsTotal}`}
              subtitle="Registrados"
              icon={FileText}
              delay={160}
            />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finales registrados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted">
            <div className="rounded-2xl border border-border/60 bg-surface/80 px-4 py-3">
              Total de finales: <span className="text-text font-semibold">{finalsTotal}</span>
            </div>
            {finals.length ? (
              <div className="space-y-2">
                {finals.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/45 bg-surface/80 px-4 py-3"
                  >
                    <p className="font-semibold text-text">
                      {item.title} · {item.subject ?? "Materia"}
                    </p>
                    <p className="text-xs text-muted">
                      {item.date}
                      {item.grade !== null ? ` · Nota ${item.grade}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No hay finales registrados todavía." />
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Listo
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
