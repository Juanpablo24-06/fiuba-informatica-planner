"use client";

import { useEffect, useRef } from "react";
import ChatPanel from "@/components/dashboard/chat-panel";

export default function SynapseLauncher({ role }: { role?: "admin" | "viewer" }) {
  const launcherRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!launcherRef.current) return;
    const element = launcherRef.current;
    const update = () => {
      document.documentElement.style.setProperty("--synapse-launcher-height", `${element.offsetHeight}px`);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      ref={launcherRef}
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-30 flex justify-center px-4"
    >
      <ChatPanel
        role={role}
        trigger={
          <button
            type="button"
            className="pointer-events-auto flex w-full max-w-[14.5rem] items-center justify-between gap-1.5 rounded-2xl border border-border/65 bg-surface/96 px-2.5 py-2.5 text-left shadow-soft backdrop-blur transition hover:-translate-y-0.5 hover:border-accent/45"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent text-xs">
              ✦
            </span>
            <span className="flex-1 truncate text-[12px] font-medium text-muted">
              Consultá a Synapse
            </span>
            <span className="shrink-0 rounded-full border border-accent/40 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
              →
            </span>
          </button>
        }
      />
    </div>
  );
}
