"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { getProgressRect } from "@/components/layout/map-progress-transition";
import {
  buildPendingNavigationStateFromCurrent,
  createTransitionId,
  getDisplaySection,
  getLauncherModeForSection,
  getSectionForPathname,
  setMapTransitionState,
  useMapTransitionState,
  type AppSection,
  type MapTransitionSource
} from "@/components/layout/map-transition-store";

type SectionLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "href"> &
  Omit<LinkProps, "href"> & {
    href: AppSection | "/agenda/semana" | "/agenda/evaluaciones";
    transitionSource?: MapTransitionSource;
  };

const hasModifiedClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

export default function SectionLink({
  href,
  onClick,
  transitionSource = null,
  prefetch = false,
  ...props
}: SectionLinkProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const transitionState = useMapTransitionState();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || hasModifiedClick(event)) return;

    const currentSection = getDisplaySection(pathname, transitionState.pendingSection);
    const nextSection = getSectionForPathname(href);
    if (currentSection === nextSection) return;

    event.preventDefault();

    const startedAt = Date.now();
    const transitionId = createTransitionId();
    const pendingState = buildPendingNavigationStateFromCurrent({
      pathname,
      pendingSection: transitionState.pendingSection,
      toPathname: href,
      startedAt,
      transitionId
    });
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shouldCaptureSummaryBar =
      pendingState.animateMapBar && pendingState.startedFromSection === "/" && !reducedMotion;

    const progressSourceRect = shouldCaptureSummaryBar ? getProgressRect("summary") : null;
    const shouldAnimateMapBar = shouldCaptureSummaryBar && Boolean(progressSourceRect);

    setMapTransitionState({
      ...pendingState,
      minimumLoaderMs: reducedMotion ? 0 : pendingState.minimumLoaderMs,
      animateMapBar: shouldAnimateMapBar,
      mapEntryPhase: shouldAnimateMapBar ? pendingState.mapEntryPhase : "loader",
      loaderStartedAt: shouldAnimateMapBar ? pendingState.loaderStartedAt : startedAt,
      mapContentReady: false,
      transitionSource,
      transitioning: true,
      launcherMode: getLauncherModeForSection(nextSection),
      progressSourceSlot: progressSourceRect ? "summary" : null,
      progressSourceRect,
      progressTargetSlot: pendingState.showMapBar ? "map-bottom" : null
    });

    router.push(href);
  };

  return <Link href={href} onClick={handleClick} prefetch={prefetch} {...props} />;
}
