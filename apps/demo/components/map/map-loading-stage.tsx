import MapSceneBackground from "@/components/map/map-scene-background";

type MapLoadingStageProps = {
  backgroundPosition?: "absolute" | "fixed";
};

/**
 * Mapa loader — "Path finder" concept.
 * A curved SVG path traces itself like a marker drawing a route on a map,
 * with a dot that follows the path.
 */
export default function MapLoadingStage({
  backgroundPosition = "absolute"
}: MapLoadingStageProps) {
  return (
    <div className="relative min-h-[100svh]">
      <MapSceneBackground
        position={backgroundPosition}
        contentClassName="px-6 pb-[calc(var(--synapse-launcher-height,56px)+2rem)]"
      >
        <div className="loader-container relative w-full max-w-[900px]" data-testid="map-loader-diagram">
          <svg
            viewBox="0 0 800 300"
            className="w-full h-auto"
            fill="none"
            aria-hidden="true"
          >
            {/* Main winding path */}
            <path
              d="M 60 240 C 120 240, 140 80, 200 80 S 280 200, 360 160 S 440 40, 520 80 S 600 220, 680 180 S 740 100, 760 60"
              stroke="rgb(var(--color-accent))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="1200"
              strokeDashoffset="1200"
              className="loader-path-trace"
            />
            {/* Secondary branch */}
            <path
              d="M 360 160 C 380 200, 420 260, 500 240 S 580 200, 620 260"
              stroke="rgb(var(--color-accent-3))"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="400"
              strokeDashoffset="400"
              className="loader-path-trace"
              style={{ animationDelay: "1s" }}
              opacity="0.6"
            />
            {/* Waypoint nodes */}
            {[
              { cx: 60, cy: 240, color: "rgb(var(--color-accent))", delay: "0.5s" },
              { cx: 200, cy: 80, color: "rgb(var(--color-accent-2))", delay: "1.2s" },
              { cx: 360, cy: 160, color: "rgb(var(--color-accent))", delay: "1.8s" },
              { cx: 520, cy: 80, color: "rgb(var(--color-accent-3))", delay: "2.4s" },
              { cx: 680, cy: 180, color: "rgb(var(--color-accent-2))", delay: "3s" },
              { cx: 760, cy: 60, color: "rgb(var(--color-accent))", delay: "3.5s" },
            ].map((node, i) => (
              <g key={i}>
                {/* Halo ring */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="12"
                  stroke={node.color}
                  strokeWidth="1"
                  fill="none"
                  opacity="0"
                  className="loader-waypoint-appear"
                  style={{ animationDelay: node.delay }}
                />
                {/* Core dot */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="4"
                  fill={node.color}
                  opacity="0"
                  className="loader-waypoint-appear"
                  style={{ animationDelay: node.delay }}
                />
              </g>
            ))}
            {/* Traveling dot */}
            <circle
              r="5"
              fill="rgb(var(--color-accent))"
              className="loader-traveling-dot"
            >
              <animateMotion
                dur="1.7s"
                repeatCount="indefinite"
                path="M 60 240 C 120 240, 140 80, 200 80 S 280 200, 360 160 S 440 40, 520 80 S 600 220, 680 180 S 740 100, 760 60"
              />
            </circle>
          </svg>
        </div>
      </MapSceneBackground>
    </div>
  );
}
