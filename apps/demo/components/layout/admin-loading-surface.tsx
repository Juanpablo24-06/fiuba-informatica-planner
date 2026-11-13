import { useEffect, useState } from "react";

const LINES = [
  { segments: 18, color: "rgb(var(--color-accent))" },
  { segments: 24, color: "rgb(var(--color-accent-2))" },
  { segments: 14, color: "rgb(var(--color-accent-3))" },
  { segments: 20, color: "rgb(var(--color-accent))" },
];

/**
 * Admin loader — "Terminal typing" concept.
 * Animated blocks that fill in like a progress readout. No actual text.
 */
export default function AdminLoadingSurface({ className }: { className?: string }) {
  const [progress, setProgress] = useState<number[]>([0, 0, 0, 0]);
  const [activeLine, setActiveLine] = useState(0);

  useEffect(() => {
    if (activeLine >= LINES.length) {
      const timer = setTimeout(() => {
        setProgress([0, 0, 0, 0]);
        setActiveLine(0);
      }, 500);
      return () => clearTimeout(timer);
    }

    const line = LINES[activeLine];
    const current = progress[activeLine];
    if (current >= line.segments) {
      const timer = setTimeout(() => setActiveLine((prev) => prev + 1), 130);
      return () => clearTimeout(timer);
    }

    const speed = 20 + Math.random() * 25;
    const timer = setTimeout(() => {
      setProgress((prev) => {
        const next = [...prev];
        next[activeLine] = prev[activeLine] + 1;
        return next;
      });
    }, speed);
    return () => clearTimeout(timer);
  }, [activeLine, progress]);

  return (
    <div className={`flex items-center justify-center min-h-[60vh] ${className ?? ""}`}>
      <div className="loader-container w-full max-w-sm px-6">
        <div className="rounded-xl border border-border/60 bg-surface-2/60 p-5 shadow-soft">
          {/* Terminal header dots */}
          <div className="flex gap-1.5 mb-5">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
          </div>
          {/* Lines as block segments */}
          <div className="flex flex-col gap-3">
            {LINES.map((line, i) => {
              const filled = progress[i];
              if (i > activeLine && filled === 0) return null;
              const showCursor = i === activeLine && activeLine < LINES.length;

              return (
                <div key={i} className="flex items-center gap-1 h-5">
                  {/* Filled blocks */}
                  {Array.from({ length: line.segments }).map((_, j) => (
                    <div
                      key={j}
                      className="h-full flex-1 rounded-sm transition-colors duration-75"
                      style={{
                        backgroundColor: j < filled
                          ? line.color
                          : "rgb(var(--color-surface-2) / 0.5)",
                      }}
                    />
                  ))}
                  {/* Cursor */}
                  {showCursor && (
                    <div
                      className="loader-blink-cursor h-full w-1 rounded-sm"
                      style={{ backgroundColor: line.color }}
                    />
                  )}
                </div>
              );
            })}
            {activeLine >= LINES.length && (
              <div className="flex items-center gap-1 h-5">
                <div
                  className="h-3 w-3 rounded-full bg-success/70 loader-block-appear"
                  style={{ animationDelay: "0s" }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
