"use client";

import { useEffect, useRef } from "react";
import { createScope, eases, waapi } from "animejs";

type RouteMotionProps = {
  children: React.ReactNode;
  routeKey: string;
};

/**
 * Gives regular app routes a small, purposeful entrance while leaving special
 * transition surfaces (notably the map) under their own coordinator.
 */
export default function RouteMotion({ children, routeKey }: RouteMotionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    scopeRef.current?.revert();

    const scope = createScope({
      root,
      mediaQueries: {
        reduceMotion: "(prefers-reduced-motion: reduce)"
      }
    }).add((self) => {
      if (self?.matches.reduceMotion) return;

      const motionItems = Array.from(
        root.querySelectorAll<HTMLElement>("[data-motion-item]")
      );
      const staggeredItems = Array.from(
        root.querySelectorAll<HTMLElement>("[data-motion-stagger]")
      );
      const animations: Animation[] = [];
      const easing = waapi.convertEase(eases.out(3));
      const enter = (targets: HTMLElement[], offset: number, duration: number, delay = 0, step = 0) => {
        targets.forEach((target, index) => {
          // Native effects leave React's attributes intact, including streamed
          // descendants that have not hydrated when this parent effect runs.
          const animation = target.animate([
            { opacity: 0, transform: `translateY(${offset}px)` },
            { opacity: 1, transform: "translateY(0px)" }
          ], { duration, delay: delay + index * step, easing, fill: "backwards" });
          animation.onfinish = () => animation.cancel();
          animations.push(animation);
        });
      };

      enter(motionItems.length ? motionItems : [root], motionItems.length ? 6 : 4, 280);
      enter(staggeredItems, 4, 240, 0, 12);

      return () => animations.forEach((animation) => animation.cancel());
    });

    scopeRef.current = scope;

    return () => {
      scope.revert();
      if (scopeRef.current === scope) {
        scopeRef.current = null;
      }
    };
  }, [routeKey]);

  return (
    <div ref={rootRef} className="route-motion-root" data-route-motion-root>
      {children}
    </div>
  );
}
