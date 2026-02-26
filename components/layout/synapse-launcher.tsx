"use client";

import ChatPanel from "@/components/dashboard/chat-panel";

export default function SynapseLauncher({ role }: { role?: "admin" | "viewer" }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <ChatPanel
        role={role}
        trigger={
          <button
            type="button"
            className="pointer-events-auto flex w-full max-w-3xl items-center justify-between gap-4 rounded-[1.35rem] border border-border/65 bg-surface/96 px-4 py-3 text-left shadow-soft backdrop-blur transition hover:-translate-y-0.5 hover:border-accent/45"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent">
              ✦
            </span>
            <span className="flex-1 truncate text-sm text-muted">
              Consultá a Synapse sobre horarios, parciales o correlativas...
            </span>
            <span className="rounded-full border border-accent/40 px-3 py-1 text-[11px] font-semibold text-accent">
              →
            </span>
          </button>
        }
      />
    </div>
  );
}
