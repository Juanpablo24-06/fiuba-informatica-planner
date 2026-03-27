"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MapSceneBackgroundProps = {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  position?: "absolute" | "fixed";
};

export default function MapSceneBackground({
  children,
  className,
  contentClassName,
  position = "absolute"
}: MapSceneBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      data-map-scene-background="true"
      className={cn(
        "pointer-events-none inset-0 overflow-hidden",
        position === "fixed" ? "fixed" : "absolute",
        className
      )}
    >
      <div
        className="absolute inset-0 subtle-grid opacity-[0.08]"
        style={{ backgroundPosition: "0 0, 0 0" }}
      />

      {children ? (
        <div className={cn("relative flex min-h-[100svh] items-center justify-center", contentClassName)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
