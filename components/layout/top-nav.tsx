"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutGrid, MapPinned, Settings } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { useMapTransitionState } from "@/components/layout/map-transition-coordinator";
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
  const headerRef = useRef<HTMLElement | null>(null);
  const mapTransitionState = useMapTransitionState();
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
      className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-2.5"
    >
      <div
        className="pointer-events-auto relative mx-auto w-full max-w-[1270px] rounded-xl border border-border/70 bg-surface px-3 py-2 shadow-[0_18px_38px_-24px_rgb(var(--shadow-color)/0.28)]"
        style={{ backgroundColor: "rgb(var(--color-surface))" }}
      >
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex shrink-0 items-center gap-2.5">
            <BrandLogo />
            <div className="min-w-0 hidden sm:block">
              <p className="text-base font-bold leading-tight text-text">Plan Ing Informática</p>
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted">Plan 2023 · FIUBA</p>
            </div>
          </div>

          {/* Separator */}
          <div className="hidden h-6 w-px bg-border/40 md:block" />

          {/* Nav links */}
          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={item.href === "/mapa" ? false : undefined}
                  data-map-transition-source={
                    item.href === "/mapa"
                      ? "top-nav-map"
                      : item.href === "/"
                      ? "top-nav-summary"
                      : undefined
                  }
                  data-active={active ? "true" : "false"}
                  className={cn(
                    "group relative inline-flex items-center gap-2 py-1.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "text-accent"
                      : mapTransitionState.transitioning
                      ? "text-muted"
                      : "text-muted hover:text-text"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors duration-200 motion-reduce:animate-none",
                      active
                        ? "text-accent"
                        : mapTransitionState.transitioning
                        ? ""
                        : "group-hover:text-accent",
                      mapTransitionState.transitioning ? "" : iconMotionClassByHref[item.href] ?? ""
                    )}
                    style={iconStyleByHref[item.href]}
                    strokeWidth={active ? 2 : 1.8}
                  />
                  {item.label}
                  <span
                    className={cn(
                      "absolute -bottom-1 left-0 right-0 h-[2px] origin-center rounded-full bg-accent transition-transform duration-200",
                      active
                        ? "scale-x-100"
                        : mapTransitionState.transitioning
                        ? "scale-x-0"
                        : "scale-x-0 group-hover:scale-x-100"
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle className="text-text/70 hover:text-accent" />
            <ProfileMenu role={role} />
          </div>
        </div>

        <div className="mt-2 border-t border-border/50 pt-2 md:hidden">
          <nav className={cn("grid gap-2", navItems.length >= 4 ? "grid-cols-4" : "grid-cols-3")}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={item.href === "/mapa" ? false : undefined}
                  data-map-transition-source={
                    item.href === "/mapa"
                      ? "top-nav-map"
                      : item.href === "/"
                      ? "top-nav-summary"
                      : undefined
                  }
                  data-active={active ? "true" : "false"}
                  className={cn(
                    "group rounded-full border px-3 py-2 text-center text-xs font-semibold transition-all duration-200",
                    active
                      ? "border-accent/40 bg-accent/12 text-accent shadow-[inset_0_0_0_1px_rgb(var(--color-accent)/0.14)]"
                      : mapTransitionState.transitioning
                      ? "border-border/70 bg-surface text-muted"
                      : "border-border/70 bg-surface text-muted hover:border-accent/25 hover:text-text"
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 transition-colors duration-200 motion-reduce:animate-none",
                        active ? "text-accent" : "",
                        mapTransitionState.transitioning ? "" : iconMotionClassByHref[item.href] ?? ""
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
      </div>
    </header>
  );
}
