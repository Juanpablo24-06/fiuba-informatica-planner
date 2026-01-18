"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { CalendarClock, LayoutGrid, Map, Sparkles, SquareTerminal } from "lucide-react";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/layout/logout-button";
import ChatPanel from "@/components/dashboard/chat-panel";

const navItems = [
  { href: "/", label: "Panel", icon: LayoutGrid },
  { href: "/mapa", label: "Mapa", icon: Map },
  { href: "/horario", label: "Horario", icon: CalendarClock }
];

export default function TopNav({ role }: { role?: "admin" | "viewer" }) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const roleLabel = role === "admin" ? "Admin" : "Viewer/Usuario";

  const activeHref = useMemo(() => {
    if (!pathname) return "/";
    if (pathname.startsWith("/mapa")) return "/mapa";
    if (pathname.startsWith("/horario")) return "/horario";
    return "/";
  }, [pathname]);

  useEffect(() => {
    if (!headerRef.current) return;
    const element = headerRef.current;
    const update = () => {
      document.documentElement.style.setProperty(
        "--app-header-height",
        `${element.offsetHeight}px`
      );
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
    <header
      ref={headerRef}
      className="sticky top-0 z-30 border-b border-white/[0.12] bg-canvas/85 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.12] bg-surface/80 shadow-glow">
            <SquareTerminal className="h-5 w-5 text-accent" strokeWidth={1.6} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted">
              Informatica
            </p>
            <h1 className="text-base font-semibold text-text font-display">Plan 2023</h1>
          </div>
        </div>

        <nav className="hidden flex-1 items-center justify-center md:flex">
          <div className="flex items-center gap-1 rounded-full border border-white/[0.12] bg-surface/80 p-1 shadow-tile">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition",
                    isActive
                      ? "border border-accent/50 bg-accent/20 text-text shadow-glow"
                      : "border border-transparent text-muted hover:text-text"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.6} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <ChatPanel
            trigger={
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-accent/50 bg-accent/15 px-3 py-2 text-xs font-semibold text-text transition hover:border-accent/70"
              >
                <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.6} />
                <span className="hidden sm:inline">Synapse IA</span>
              </button>
            }
          />
          <div className="flex items-center rounded-full border border-white/[0.12] bg-surface/80 px-3 py-1 text-[11px] text-muted">
            <span className="mr-2 hidden uppercase tracking-[0.2em] sm:inline">Rol</span>
            <span className="font-semibold text-text">{roleLabel}</span>
          </div>
          <LogoutButton />
        </div>
      </div>

      <div className="border-t border-white/[0.08] px-6 py-3 md:hidden">
        <nav className="grid grid-cols-3 gap-2 rounded-full border border-white/[0.12] bg-surface/80 p-1 text-[11px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-full px-3 py-2 font-semibold",
                  isActive
                    ? "border border-accent/50 bg-accent/20 text-text"
                    : "border border-transparent text-muted"
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.6} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
