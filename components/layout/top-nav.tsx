"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutGrid, MapPinned, Settings } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/layout/brand-logo";
import LogoutButton from "@/components/layout/logout-button";
import ProfileMenu from "@/components/layout/profile-menu";

const baseItems = [
  { href: "/", label: "Resumen", icon: LayoutGrid },
  { href: "/mapa", label: "Mapa", icon: MapPinned },
  { href: "/horario", label: "Agenda", icon: CalendarDays }
] as const;

export default function TopNav({ role }: { role?: "admin" | "viewer" }) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const navItems = role === "admin"
    ? [...baseItems, { href: "/admin", label: "Admin", icon: Settings }]
    : baseItems;

  const activeHref = useMemo(() => {
    if (!pathname) return "/";
    if (pathname.startsWith("/mapa")) return "/mapa";
    if (pathname.startsWith("/horario")) return "/horario";
    if (pathname.startsWith("/admin")) return "/admin";
    return "/";
  }, [pathname]);

  useEffect(() => {
    if (!headerRef.current) return;
    const element = headerRef.current;
    const update = () => {
      document.documentElement.style.setProperty("--app-header-height", `${element.offsetHeight}px`);
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
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-border/50 bg-canvas/92 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1360px] items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <BrandLogo />
          <div>
            <p className="text-[1.55rem] font-bold leading-none text-text">Plan Ing Informática</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted">Plan 2023 · FIUBA</p>
          </div>
        </div>

        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative inline-flex items-center gap-2 pb-1 text-base font-medium transition",
                  active ? "text-accent" : "text-muted hover:text-text"
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.9} />
                {item.label}
                <span
                  className={cn(
                    "absolute -bottom-0.5 left-0 h-[2px] w-full origin-left rounded-full bg-accent transition",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ProfileMenu role={role} />
          <LogoutButton />
        </div>
      </div>

      <div className="border-t border-border/50 px-4 pb-3 pt-2 md:hidden">
        <nav className={cn("grid gap-2", navItems.length >= 4 ? "grid-cols-4" : "grid-cols-3")}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full border px-3 py-2 text-center text-xs font-semibold transition",
                  active
                    ? "border-accent/50 bg-accent text-accent-contrast"
                    : "border-border/70 bg-surface text-muted"
                )}
              >
                <span className="inline-flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
