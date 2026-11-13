"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminSection = {
  id: string;
  label: string;
  content: ReactNode;
  wide?: boolean;
};

export default function AdminResponsiveWorkspace({ sections }: { sections: AdminSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  return (
    <>
      <nav
        className="sticky top-[calc(var(--app-header-height,96px)+0.35rem)] z-30 grid grid-cols-2 gap-1 rounded-2xl border border-border/50 bg-surface/90 p-1.5 backdrop-blur-xl sm:grid-cols-4 xl:hidden"
        aria-label="Secciones de administración"
      >
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveId(section.id)}
            aria-pressed={activeId === section.id}
            className={cn(
              "min-w-0 rounded-xl px-2 py-2.5 text-xs font-semibold transition",
              activeId === section.id
                ? "bg-accent text-accent-content"
                : "text-muted hover:bg-surface-2 hover:text-text"
            )}
          >
            <span className="block truncate">{section.label}</span>
          </button>
        ))}
      </nav>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2 2xl:gap-6">
        {sections.map((section) => (
          <section
            key={section.id}
            className={cn(
              "min-w-0",
              activeId !== section.id && "hidden xl:block",
              section.wide && "xl:col-span-2"
            )}
          >
            {section.content}
          </section>
        ))}
      </div>
    </>
  );
}
