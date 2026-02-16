"use client";

import { cn } from "@/lib/utils";

export const SUBJECT_COLORS = [
  "#1B7C5A",
  "#2A8A65",
  "#3D6A92",
  "#557FA8",
  "#C7833A",
  "#D19047",
  "#D67252",
  "#C55E3E",
  "#6A7A8C",
  "#3F4E5C",
  "#7A9A75",
  "#9F8860",
  "#7F6EA7",
  "#4F7E7A",
  "#94704F"
];

export function ColorPalette({
  value,
  onChange,
  className,
  disabled = false
}: {
  value?: string | null;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
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
            disabled={disabled}
            className={cn(
              "h-8 w-8 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50",
              isActive ? "border-accent/60 shadow-soft" : "border-border/70"
            )}
            style={{ backgroundColor: color }}
            aria-label={`Seleccionar color ${color}`}
          />
        );
      })}
    </div>
  );
}
