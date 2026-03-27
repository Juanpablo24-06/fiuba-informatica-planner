"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { getProgressRect } from "@/components/layout/map-progress-transition";
import {
  buildPendingNavigationState,
  getSectionForPathname,
  setMapTransitionState,
  type MapTransitionSource
} from "@/components/layout/map-transition-store";

type SectionLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "href"> &
  Omit<LinkProps, "href"> & {
    href: "/" | "/mapa" | "/horario" | "/admin";
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
  const pathname = usePathname() ?? "";

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || hasModifiedClick(event)) return;

    const currentSection = getSectionForPathname(pathname);
    const nextSection = getSectionForPathname(href);
    if (currentSection === nextSection) return;

    const pendingState = buildPendingNavigationState(pathname, href);
    const shouldCaptureSummaryBar =
      pendingState.animateMapBar && pendingState.startedFromSection === "/";

    const progressSourceRect = shouldCaptureSummaryBar ? getProgressRect("summary") : null;
    const shouldAnimateMapBar = shouldCaptureSummaryBar && Boolean(progressSourceRect);

    setMapTransitionState({
      ...pendingState,
      animateMapBar: shouldAnimateMapBar,
      mapEntryPhase: shouldAnimateMapBar ? pendingState.mapEntryPhase : "loader",
      loaderStartedAt: shouldAnimateMapBar ? pendingState.loaderStartedAt : pendingState.transitionStartedAt,
      transitionSource,
      transitioning: true,
      launcherMode: nextSection === "/mapa" ? "compact" : "default",
      progressSourceSlot: progressSourceRect ? "summary" : null,
      progressSourceRect,
      progressTargetSlot: pendingState.showMapBar ? "map-bottom" : null
    });
  };

  return <Link href={href} onClick={handleClick} prefetch={prefetch} {...props} />;
}
