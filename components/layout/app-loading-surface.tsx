"use client";

/**
 * Resumen loader — "Pencil sketch" concept.
 * SVG paths draw progressively as if someone is sketching dashboard cards.
 * Bigger, faster, no text.
 */
export default function AppLoadingSurface({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center min-h-[60vh] ${className ?? ""}`}>
      <div className="loader-container w-full max-w-md px-6">
        <svg
          viewBox="0 0 400 280"
          className="w-full h-auto"
          fill="none"
          aria-hidden="true"
        >
          {/* Main card outline */}
          <rect
            x="10" y="10" width="380" height="260" rx="12"
            stroke="rgb(var(--color-accent))"
            strokeWidth="1.5"
            strokeDasharray="1280"
            strokeDashoffset="1280"
            className="loader-pencil-stroke"
            style={{ animationDelay: "0s" }}
          />
          {/* Title block */}
          <rect
            x="32" y="36" width="140" height="10" rx="5"
            fill="rgb(var(--color-accent-2) / 0.4)"
            className="loader-block-appear"
            style={{ animationDelay: "0.2s" }}
          />
          <rect
            x="32" y="56" width="90" height="6" rx="3"
            fill="rgb(var(--color-accent-3) / 0.25)"
            className="loader-block-appear"
            style={{ animationDelay: "0.35s" }}
          />
          {/* Card 1 */}
          <rect
            x="32" y="86" width="165" height="80" rx="8"
            stroke="rgb(var(--color-accent-3))"
            strokeWidth="1.2"
            strokeDasharray="490"
            strokeDashoffset="490"
            className="loader-pencil-stroke"
            style={{ animationDelay: "0.4s" }}
          />
          <rect
            x="48" y="106" width="100" height="8" rx="4"
            fill="rgb(var(--color-accent) / 0.3)"
            className="loader-block-appear"
            style={{ animationDelay: "0.6s" }}
          />
          <rect
            x="48" y="122" width="70" height="6" rx="3"
            fill="rgb(var(--color-accent) / 0.18)"
            className="loader-block-appear"
            style={{ animationDelay: "0.7s" }}
          />
          <rect
            x="48" y="140" width="120" height="6" rx="3"
            fill="rgb(var(--color-accent) / 0.12)"
            className="loader-block-appear"
            style={{ animationDelay: "0.8s" }}
          />
          {/* Card 2 */}
          <rect
            x="213" y="86" width="165" height="80" rx="8"
            stroke="rgb(var(--color-accent-2))"
            strokeWidth="1.2"
            strokeDasharray="490"
            strokeDashoffset="490"
            className="loader-pencil-stroke"
            style={{ animationDelay: "0.5s" }}
          />
          <rect
            x="229" y="106" width="120" height="8" rx="4"
            fill="rgb(var(--color-accent-2) / 0.3)"
            className="loader-block-appear"
            style={{ animationDelay: "0.7s" }}
          />
          <rect
            x="229" y="122" width="80" height="6" rx="3"
            fill="rgb(var(--color-accent-2) / 0.18)"
            className="loader-block-appear"
            style={{ animationDelay: "0.8s" }}
          />
          <rect
            x="229" y="140" width="100" height="6" rx="3"
            fill="rgb(var(--color-accent-2) / 0.12)"
            className="loader-block-appear"
            style={{ animationDelay: "0.9s" }}
          />
          {/* Bottom bar */}
          <rect
            x="32" y="190" width="346" height="50" rx="8"
            stroke="rgb(var(--color-accent))"
            strokeWidth="1"
            strokeDasharray="792"
            strokeDashoffset="792"
            className="loader-pencil-stroke"
            style={{ animationDelay: "0.8s" }}
          />
          <rect
            x="48" y="206" width="200" height="8" rx="4"
            fill="rgb(var(--color-accent) / 0.2)"
            className="loader-block-appear"
            style={{ animationDelay: "1s" }}
          />
          <rect
            x="48" y="222" width="140" height="5" rx="2.5"
            fill="rgb(var(--color-accent-3) / 0.15)"
            className="loader-block-appear"
            style={{ animationDelay: "1.1s" }}
          />
        </svg>
      </div>
    </div>
  );
}
