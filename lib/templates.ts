import type { EvaluationTemplate } from "@/lib/types";

const TEMPLATE_LABELS: Record<string, string> = {
  parciales: "Parciales",
  recuperatorios: "Recup",
  tps: "TPs",
  defensas: "Defensas",
  finales: "Finales",
  promocion: "Promoción",
  notas: "Notas"
};

export const formatEvaluationTemplate = (template?: EvaluationTemplate | null) => {
  if (!template) return "Sin plantilla";
  const entries = Object.entries(template)
    .map(([key, value]) => {
      if (value === null || value === undefined || value === "") return null;
      if (key === "promocion") return value ? TEMPLATE_LABELS.promocion : null;
      if (key === "notas") return `${TEMPLATE_LABELS.notas}: ${value}`;
      return `${TEMPLATE_LABELS[key] ?? key}: ${value}`;
    })
    .filter(Boolean) as string[];
  return entries.length ? entries.join(" · ") : "Sin plantilla";
};
