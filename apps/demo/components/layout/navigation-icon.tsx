"use client";

import { Settings } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import type { AppSection } from "@/components/layout/map-transition-store";
import { CALENDAR_PERIOD_MOTION } from "@/lib/calendar-motion";
import { cn } from "@/lib/utils";

const movements: Record<string, { transforms: string[]; duration: number }> = {
  tile: { transforms: ["scale(1)", "scale(.86)", "scale(1)"], duration: 620 },
  pin: { transforms: ["translateY(0)", "translateY(-2.5px)", "translateY(0)"], duration: 680 },
  book: { transforms: ["rotate(0deg)", "rotate(-10deg)", "rotate(0deg)"], duration: 700 },
  slider: { transforms: ["translateX(0)", "translateX(3px)", "translateX(0)"], duration: 660 },
  gear: { transforms: ["rotate(0deg)", "rotate(60deg)"], duration: 800 }
};

/**
 * Lucide silhouettes with independent parts for action feedback.
 * Geometry adapted from lucide-react, ISC license, Lucide Contributors 2025.
 */
export default function NavigationIcon({
  href,
  active = false,
  className,
  strokeWidth = 1.8
}: {
  href: AppSection;
  active?: boolean;
  className?: string;
  strokeWidth?: number;
}) {
  const rootRef = useRef<SVGSVGElement>(null);
  const animations = useRef<Animation[]>([]);
  const cancel = useCallback(() => {
    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
  }, []);

  const play = useCallback((direction = 1) => {
    const root = rootRef.current;
    if (!root || animations.current.length || !root.getClientRects().length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sign = direction < 0 ? -1 : 1;
    root.querySelectorAll<SVGElement>("[data-icon-part]").forEach((part, index) => {
      const name = part.dataset.iconPart ?? "tile";
      const movement = movements[name] ?? movements.tile;
      const frames: Keyframe[] = name === "page" ? [
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1, offset: 0 },
        { transform: `translate(${sign}px, -1px) rotate(${-sign * 5}deg)`, opacity: 1, offset: .28 },
        { transform: `translate(${sign * 3}px, 7px) rotate(${sign * 16}deg)`, opacity: 0, offset: .7 },
        { transform: "translate(0, 0) rotate(0deg)", opacity: 0, offset: .71 },
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1, offset: 1 }
      ] : movement.transforms.map(transform => ({ transform }));
      const animation = part.animate(frames, {
        duration: name === "page" ? 860 : movement.duration,
        delay: name === "tile" || name === "slider" ? index * 45 : 0,
        easing: "cubic-bezier(.4,0,.2,1)", fill: "none"
      });
      animation.onfinish = () => {
        animation.cancel();
        animations.current = animations.current.filter(item => item !== animation);
      };
      animations.current.push(animation);
    });
  }, []);

  useEffect(() => {
    const link = rootRef.current?.closest("a");
    const respond = () => play();
    const periodChanged = (event: Event) => play((event as CustomEvent<number>).detail);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preferenceChanged = () => { if (preference.matches) cancel(); };
    link?.addEventListener("pointerenter", respond);
    link?.addEventListener("focus", respond);
    link?.addEventListener("click", respond);
    if (href === "/calendario") window.addEventListener(CALENDAR_PERIOD_MOTION, periodChanged);
    preference.addEventListener("change", preferenceChanged);
    return () => {
      link?.removeEventListener("pointerenter", respond);
      link?.removeEventListener("focus", respond);
      link?.removeEventListener("click", respond);
      window.removeEventListener(CALENDAR_PERIOD_MOTION, periodChanged);
      preference.removeEventListener("change", preferenceChanged);
      cancel();
    };
  }, [href, play, cancel]);

  useEffect(() => { if (active) play(); }, [active, play]);


  return (
    <svg ref={rootRef} data-navigation-icon={href} aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0 overflow-visible [&_[data-icon-part]]:origin-center [&_[data-icon-part]]:[transform-box:fill-box]", className)}>
      {href === "/" ? <>{[[3, 3], [14, 3], [3, 14], [14, 14]].map(([x, y]) => <rect key={`${x}-${y}`} data-icon-part="tile" x={x} y={y} width="7" height="7" rx="1" />)}</> : null}
      {href === "/mapa" ? <>
        <path d="M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712" />
        <g data-icon-part="pin"><path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0" /><circle cx="12" cy="8" r="2" /></g>
      </> : null}
      {href === "/cursos" ? <>
        <rect x="3" y="3" width="8" height="18" rx="1" /><path d="M7 3v18" />
        <g data-icon-part="book" style={{ transformOrigin: "17px 21px", transformBox: "view-box" }}><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z" /></g>
      </> : null}
      {href === "/planificar" ? <>
        <path d="M3 5h18M3 12h18M3 19h18" />
        <path data-icon-part="slider" d="M14 3v4" /><path data-icon-part="slider" d="M8 10v4" /><path data-icon-part="slider" d="M16 17v4" />
      </> : null}
      {href === "/calendario" ? <>
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M8 2v4m8-4v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
        <g data-icon-part="page" style={{ transformOrigin: "12px 10px", transformBox: "view-box" }}>
          <path d="M3 10h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" fill="rgb(var(--color-surface))" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
        </g>
      </> : null}
      {href === "/admin" ? <g data-icon-part="gear"><Settings width="24" height="24" strokeWidth={strokeWidth} /></g> : null}
    </svg>
  );
}
