"use client";

import { useEffect, useState } from "react";
import MapLoadingStage from "@/components/map/map-loading-stage";
import {
  clearMapEntryLoader,
  getMapEntryLoaderRemainingMs
} from "@/lib/map/map-entry-transition";

export default function MapEntryOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const remaining = getMapEntryLoaderRemainingMs();
    if (remaining <= 0) return;

    setVisible(true);
    const timeout = window.setTimeout(() => {
      clearMapEntryLoader();
      setVisible(false);
    }, remaining);

    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40">
      <MapLoadingStage />
    </div>
  );
}
