"use client";

import { cn } from "@/lib/utils";

export const SUBJECT_COLORS = [
  "#1F8F67",
  "#2EA476",
  "#2F6F9E",
  "#4F89B5",
  "#2F8B89",
  "#6786A3",
  "#6DA45F",
  "#A57D42",
  "#D08A2F",
  "#E0A141",
  "#DE6E4A",
  "#C85135",
  "#8F6B43"
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
