"use client";

import { cn } from "@/lib/utils";

export const SUBJECT_COLORS = [
  "#A855F7",
  "#8B5CF6",
  "#6366F1",
  "#3B82F6",
  "#38BDF8",
  "#22D3EE",
  "#14B8A6",
  "#34D399",
  "#10B981",
  "#84CC16",
  "#FBBF24",
  "#F97316",
  "#FB7185",
  "#F43F5E",
  "#E879F9"
];

export function ColorPalette({
  value,
  onChange,
  className
}: {
  value?: string | null;
  onChange: (value: string) => void;
  className?: string;
}) {
  const normalized = value?.toLowerCase() ?? "";
  const colors = normalized && !SUBJECT_COLORS.map((color) => color.toLowerCase()).includes(normalized)
    ? [...SUBJECT_COLORS, value ?? ""]
    : SUBJECT_COLORS;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {colors.map((color) => {
        const isActive = color.toLowerCase() === normalized;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              "h-8 w-8 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
              isActive ? "border-white/70 shadow-glow" : "border-white/[0.18]"
            )}
            style={{ backgroundColor: color }}
            aria-label={`Seleccionar color ${color}`}
          />
        );
      })}
    </div>
  );
}
