"use client";

import type { ProgressSlot, ProgressSourceRect } from "@/components/layout/map-transition-store";

export const MAP_TRANSITION_DURATION_MS = 480;
export const MIN_DESTINATION_SETTLE_MS = 300;
export const MAP_TRANSITION_SNAP_THRESHOLD_PX = 10;

export const getProgressRect = (slot: ProgressSlot): ProgressSourceRect | null => {
  const element = document.querySelector<HTMLElement>(`[data-progress-slot='${slot}']`);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
};

export const getProgressGhostRect = (slot: ProgressSlot): ProgressSourceRect | null => {
  const element = document.querySelector<HTMLElement>(
    `[data-progress-ghost-slot='${slot}']`
  );
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
};

export const setProgressSlotHidden = (slot: ProgressSlot | null, hidden: boolean) => {
  if (!slot) return;
  const element = document.querySelector<HTMLElement>(`[data-progress-slot='${slot}']`);
  if (!element) return;

  element.style.opacity = hidden ? "0" : "";
};

export const rectDistance = (fromRect: ProgressSourceRect, toRect: ProgressSourceRect) =>
  Math.max(
    Math.abs(fromRect.left - toRect.left),
    Math.abs(fromRect.top - toRect.top),
    Math.abs(fromRect.width - toRect.width),
    Math.abs(fromRect.height - toRect.height)
  );

export const shouldAnimateToTargetRect = (
  fromRect: ProgressSourceRect,
  toRect: ProgressSourceRect,
  threshold = MAP_TRANSITION_SNAP_THRESHOLD_PX
) => rectDistance(fromRect, toRect) > threshold;

export const getRemainingTransitionDuration = (
  startedAt: number,
  now = performance.now(),
  totalDuration = MAP_TRANSITION_DURATION_MS,
  minimumDuration = 160
) => Math.max(minimumDuration, totalDuration - Math.max(0, now - startedAt));
