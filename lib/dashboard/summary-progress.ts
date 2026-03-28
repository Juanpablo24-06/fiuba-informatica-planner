type SummaryProgressSegment = {
  key: string;
  label: string;
  approved: number;
  total: number;
  labelClass: string;
  markerClass: string;
  trackClass: string;
  tooltipTitle: string;
  tooltipBody: string;
  helperText?: string;
  accentColor: string;
  trackTint: string;
  stripeColor: string;
  percentBadgeClass: string;
};

type FinalProjectTrack = "tesis" | "trabajo_profesional";

export const getSummarySegmentFillWidth = (fillPct: number) =>
  fillPct >= 100 ? "calc(100% + 1px)" : `${fillPct}%`;

export const buildSummaryProgressSegments = ({
  approvedCbcCredits,
  totalCbcCredits,
  approvedCbcCourses,
  totalCbcCourses,
  approvedObligatoryCredits,
  totalObligatoryCredits,
  approvedObligatoryCourses,
  totalObligatoryCourses,
  approvedElectiveCredits,
  totalElectiveCredits,
  approvedTifCredits,
  totalTifCredits,
  englishApproved,
  finalTrack
}: {
  approvedCbcCredits: number;
  totalCbcCredits: number;
  approvedCbcCourses: number;
  totalCbcCourses: number;
  approvedObligatoryCredits: number;
  totalObligatoryCredits: number;
  approvedObligatoryCourses: number;
  totalObligatoryCourses: number;
  approvedElectiveCredits: number;
  totalElectiveCredits: number;
  approvedTifCredits: number;
  totalTifCredits: number;
  englishApproved: boolean;
  finalTrack: FinalProjectTrack;
}): SummaryProgressSegment[] => [
  {
    key: "cbc",
    label: "CBC",
    approved: approvedCbcCredits,
    total: totalCbcCredits,
    labelClass: "text-warning",
    markerClass: "bg-warning",
    trackClass: "border-warning/25",
    tooltipTitle: "Ciclo Básico Común",
    tooltipBody: `${approvedCbcCredits} de ${totalCbcCredits} créditos aprobados`,
    helperText: `${approvedCbcCourses} de ${totalCbcCourses} materias completadas`,
    accentColor: "rgb(var(--color-warning))",
    trackTint: "rgb(var(--color-warning) / 0.18)",
    stripeColor: "rgba(255,255,255,0.22)",
    percentBadgeClass: "bg-warning text-white"
  },
  {
    key: "obligatorias",
    label: "Obligatorias",
    approved: approvedObligatoryCredits,
    total: totalObligatoryCredits,
    labelClass: "text-accent",
    markerClass: "bg-accent",
    trackClass: "border-accent/20",
    tooltipTitle: "Materias obligatorias",
    tooltipBody: `${approvedObligatoryCredits} de ${totalObligatoryCredits} créditos aprobados`,
    helperText: `${approvedObligatoryCourses} de ${totalObligatoryCourses} materias completadas`,
    accentColor: "rgb(var(--color-accent))",
    trackTint: "rgb(var(--color-accent) / 0.16)",
    stripeColor: "rgba(255,255,255,0.2)",
    percentBadgeClass: "bg-accent text-white"
  },
  {
    key: "electivas",
    label: "Electivas",
    approved: approvedElectiveCredits,
    total: totalElectiveCredits,
    labelClass: "text-elective",
    markerClass: "bg-elective",
    trackClass: "border-elective/25",
    tooltipTitle: "Materias electivas",
    tooltipBody: `${approvedElectiveCredits} de ${totalElectiveCredits} créditos aprobados`,
    accentColor: "rgb(var(--color-elective))",
    trackTint: "rgb(var(--color-elective) / 0.18)",
    stripeColor: "rgba(255,255,255,0.2)",
    percentBadgeClass: "bg-elective text-white"
  },
  {
    key: "ingles",
    label: "Inglés",
    approved: englishApproved ? 1 : 0,
    total: 1,
    labelClass: "text-[#ba9440]",
    markerClass: "bg-[#d8b04b]",
    trackClass: "border-[#d8b04b]/25",
    tooltipTitle: "Prueba de nivel de idioma inglés",
    tooltipBody: englishApproved ? "Requisito cumplido" : "Pendiente",
    helperText: "No suma créditos al total del plan",
    accentColor: "rgb(216 176 75)",
    trackTint: "rgb(216 176 75 / 0.22)",
    stripeColor: "rgba(255,255,255,0.22)",
    percentBadgeClass: "bg-[#d8b04b] text-white"
  },
  {
    key: "tif",
    label: "TIF",
    approved: approvedTifCredits,
    total: totalTifCredits,
    labelClass: "text-danger",
    markerClass: "bg-danger",
    trackClass: "border-danger/25",
    tooltipTitle: "Trabajo Integrador Final",
    tooltipBody: `${approvedTifCredits} de ${totalTifCredits} créditos aprobados`,
    helperText: finalTrack === "tesis" ? "Modalidad tesis" : "Trabajo profesional",
    accentColor: "rgb(var(--color-danger))",
    trackTint: "rgb(var(--color-danger) / 0.18)",
    stripeColor: "rgba(255,255,255,0.2)",
    percentBadgeClass: "bg-danger text-white"
  }
];

export const isTrailingSummarySegment = (key: string) =>
  key === "electivas" || key === "ingles" || key === "tif";

export type { FinalProjectTrack, SummaryProgressSegment };
