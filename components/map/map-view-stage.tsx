"use client";

import { useCallback, useState } from "react";
import { useMapTransitionState } from "@/components/layout/map-transition-coordinator";
import MapLoadingStage from "@/components/map/map-loading-stage";
import MapView from "@/components/map/map-view";
import type { MapEdge, MapNode } from "@/lib/map/types";

type MapViewStageProps = {
  nodes: MapNode[];
  edges: MapEdge[];
};

export default function MapViewStage({ nodes, edges }: MapViewStageProps) {
  const [ready, setReady] = useState(false);
  const transitionState = useMapTransitionState();
  const suppressLoader =
    transitionState.transitioning && transitionState.pendingPath === "/mapa";

  const handleReady = useCallback(() => {
    setReady(true);
  }, []);

  return (
    <div className="relative">
      {!ready && !suppressLoader ? (
        <div className="absolute inset-0 z-20">
          <MapLoadingStage />
        </div>
      ) : null}

      <div
        data-map-view-shell="true"
        aria-hidden={!ready}
        className={
          ready
            ? "visible opacity-100 transition-opacity duration-150"
            : "invisible opacity-0"
        }
      >
        <MapView nodes={nodes} edges={edges} onReady={handleReady} />
      </div>
    </div>
  );
}
