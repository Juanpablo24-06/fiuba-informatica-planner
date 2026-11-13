"use client";

/**
 * Horario/Agenda loader — "Calendar fill" concept.
 * A 7×4 grid of cells that get filled one by one like someone
 * is coloring in schedule blocks with a marker. No text.
 */
export default function HorarioLoadingSurface({ className }: { className?: string }) {
  const cols = 7;
  const rows = 4;
  const cells: { delay: number; color: string }[] = [];

  const colors = [
    "rgb(var(--color-accent))",
    "rgb(var(--color-accent-2))",
    "rgb(var(--color-accent-3))",
    "rgb(var(--color-accent))",
    "rgb(var(--color-accent-3))",
    "rgb(var(--color-accent))",
    "rgb(var(--color-accent-2))",
  ];

  // Fill order: zigzag across rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r % 2 === 0 ? c : cols - 1 - c;
      cells.push({
        delay: (r * cols + c) * 0.1,
        color: colors[idx],
      });
    }
  }

  return (
    <div className={`flex items-center justify-center min-h-[60vh] ${className ?? ""}`}>
      <div className="loader-container w-full max-w-sm px-6">
        {/* Header row placeholders */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {colors.map((color, i) => (
            <div
              key={i}
              className="h-2 rounded-full loader-block-appear"
              style={{
                backgroundColor: color,
                opacity: 0.3,
                animationDelay: `${i * 0.06}s`,
              }}
            />
          ))}
        </div>
        {/* Grid cells */}
        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell, i) => (
            <div
              key={i}
              className="loader-cell-fill rounded-lg h-14"
              style={{
                animationDelay: `${cell.delay}s`,
                "--cell-color": cell.color,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
