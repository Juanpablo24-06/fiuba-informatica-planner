"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const measureNativeScrollbarWidth = () => {
  const probe = document.createElement("div");

  Object.assign(probe.style, {
    width: "100px",
    height: "100px",
    overflow: "scroll",
    position: "absolute",
    top: "-9999px",
    pointerEvents: "none"
  });

  document.body.appendChild(probe);
  const width = probe.offsetWidth - probe.clientWidth;
  probe.remove();

  return width;
};

export default function ScrollbarCompensationSync() {
  const pathname = usePathname() ?? "";

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    let animationFrame = 0;

    const updateCompensation = () => {
      const nativeScrollbarWidth = measureNativeScrollbarWidth();
      const currentRootScrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
      const compensation = currentRootScrollbarWidth > 0 ? 0 : nativeScrollbarWidth;

      root.style.setProperty("--layout-scrollbar-compensation", `${compensation}px`);
      root.dataset.scrollbarCompensationState =
        compensation > 0 ? "active" : "idle";
    };

    const scheduleUpdate = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        updateCompensation();
      });
    };

    updateCompensation();
    scheduleUpdate();

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(root);
    resizeObserver.observe(body);

    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-app-section", "style"]
    });
    mutationObserver.observe(body, {
      attributes: true,
      attributeFilter: ["class", "data-scroll-locked", "style"]
    });

    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      delete root.dataset.scrollbarCompensationState;
      root.style.removeProperty("--layout-scrollbar-compensation");
    };
  }, [pathname]);

  return null;
}
