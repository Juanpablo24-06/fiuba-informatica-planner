"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutGrid, MapPinned, Settings } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/layout/brand-logo";
import ProfileMenu from "@/components/layout/profile-menu";
import ThemeToggle from "@/components/layout/theme-toggle";

const baseItems = [
  { href: "/", label: "Resumen", icon: LayoutGrid },
  { href: "/mapa", label: "Mapa", icon: MapPinned },
  { href: "/horario", label: "Agenda", icon: CalendarDays }
] as const;

const iconMotionClassByHref: Record<string, string> = {
  "/": "group-hover:animate-nav-summary-hover group-data-[active=true]:animate-nav-summary-active",
  "/mapa": "group-hover:animate-nav-map-hover group-data-[active=true]:animate-nav-map-active",
  "/horario": "group-hover:animate-nav-agenda-hover group-data-[active=true]:animate-nav-agenda-active",
  "/admin": "group-hover:animate-nav-admin-hover group-data-[active=true]:animate-nav-admin-active"
};

const iconStyleByHref: Record<string, CSSProperties | undefined> = {
  "/": undefined,
  "/mapa": { transformOrigin: "50% 88%" },
  "/horario": { transformOrigin: "50% 20%" },
  "/admin": { transformOrigin: "50% 50%" }
};

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
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-accent/24 shadow-[0_10px_28px_rgb(var(--shadow-color)/0.08)] backdrop-blur-2xl"
      style={{
        backgroundColor: "rgb(var(--color-accent) / 0.16)"
      }}
    >
      <div className="mx-auto grid w-full max-w-[1360px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 px-6 py-4">
        <div className="flex shrink-0 items-center gap-3">
          <BrandLogo className="shadow-[0_14px_28px_rgb(var(--color-accent)/0.16)]" />
          <div className="min-w-0">
            <p className="text-[1.55rem] font-bold leading-none text-text">Plan Ing Informática</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted">Plan 2023 · FIUBA</p>
          </div>
        </div>

        <nav className="hidden items-center justify-center gap-10 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active ? "true" : "false"}
                className={cn(
                  "group relative inline-flex items-center gap-2.5 py-2 text-base font-medium tracking-[0.01em] transition-all duration-200",
                  active
                    ? "text-accent"
                    : "text-muted hover:text-text"
                )}
              >
                <Icon
                  className={cn(
                    "h-[17px] w-[17px] transition-colors duration-200 motion-reduce:animate-none",
                    active
                      ? "text-accent"
                      : "group-hover:text-accent",
                    iconMotionClassByHref[item.href] ?? ""
                  )}
                  style={iconStyleByHref[item.href]}
                  strokeWidth={active ? 2.05 : 1.9}
                />
                {item.label}
                <span
                  className={cn(
                    "absolute -bottom-[1px] left-0 right-0 h-[2.5px] origin-center rounded-full bg-accent transition-transform duration-200",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center justify-self-end gap-3">
          <ProfileMenu role={role} />
          <ThemeToggle className="text-text/80 hover:text-accent" />
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
                data-active={active ? "true" : "false"}
                className={cn(
                  "group rounded-full border px-3 py-2 text-center text-xs font-semibold transition-all duration-200",
                  active
                    ? "border-accent/40 bg-accent/12 text-accent shadow-[inset_0_0_0_1px_rgb(var(--color-accent)/0.14)]"
                    : "border-border/70 bg-surface text-muted"
                )}
              >
                <span className="inline-flex items-center gap-1">
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 transition-colors duration-200 motion-reduce:animate-none",
                      active ? "text-accent" : "",
                      iconMotionClassByHref[item.href] ?? ""
                    )}
                    style={iconStyleByHref[item.href]}
                  />
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
