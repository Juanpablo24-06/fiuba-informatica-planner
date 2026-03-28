"use client";

import { usePathname } from "next/navigation";
import { CalendarDays, LayoutGrid, MapPinned, Settings, ChevronDown, CheckSquare, CalendarRange, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useMapTransitionState } from "@/components/layout/map-transition-coordinator";
import SectionLink from "@/components/layout/section-link";
import { resolveMobileSectionHref } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/layout/brand-logo";
import ProfileMenu from "@/components/layout/profile-menu";
import ThemeToggle from "@/components/layout/theme-toggle";
import { getDisplaySection, type AppSection } from "@/components/layout/map-transition-store";

type NavItem = {
  href: AppSection;
  label: string;
  icon: LucideIcon;
  subItems?: { href: "/agenda/semana" | "/agenda/evaluaciones"; label: string; icon: LucideIcon; description: string }[];
};

const baseItems: NavItem[] = [
  { href: "/", label: "Resumen", icon: LayoutGrid },
  { href: "/mapa", label: "Mapa", icon: MapPinned },
  {
    href: "/agenda", // Primary route acts as active prefix
    label: "Agenda",
    icon: CalendarDays,
    subItems: [
      { href: "/agenda/semana", label: "Mi Semana", icon: CalendarRange, description: "Horario de cursada semanal" },
      { href: "/agenda/evaluaciones", label: "Evaluaciones", icon: CheckSquare, description: "Parciales y entregas del mes" }
    ]
  }
];

const iconMotionClassByHref: Record<string, string> = {
  "/": "group-hover:animate-nav-summary-hover group-data-[active=true]:animate-nav-summary-active",
  "/mapa": "group-hover:animate-nav-map-hover group-data-[active=true]:animate-nav-map-active",
  "/agenda": "group-hover:animate-nav-agenda-hover group-data-[active=true]:animate-nav-agenda-active",
  "/admin": "group-hover:animate-nav-admin-hover group-data-[active=true]:animate-nav-admin-active"
};

const iconStyleByHref: Record<string, CSSProperties | undefined> = {
  "/": undefined,
  "/mapa": { transformOrigin: "50% 88%" },
  "/agenda": { transformOrigin: "50% 20%" },
  "/admin": { transformOrigin: "50% 50%" }
};

const getNavIndicatorClass = (active: boolean, transitioning: boolean) =>
  cn(
    "pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-center rounded-full bg-accent shadow-[0_0_12px_rgb(var(--color-accent)/0.28)] transition-transform duration-200",
    active
      ? "scale-x-100"
      : transitioning
      ? "scale-x-0"
      : "scale-x-0 group-hover:scale-x-100"
  );

export default function TopNav({ role }: { role?: "admin" | "viewer" }) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement | null>(null);
  const mapTransitionState = useMapTransitionState();
  const navItems: NavItem[] = role === "admin"
    ? [...baseItems, { href: "/admin", label: "Admin", icon: Settings }]
    : baseItems;

  const activeHref = useMemo(() => {
    return getDisplaySection(pathname ?? "/", mapTransitionState.pendingSection);
  }, [mapTransitionState.pendingSection, pathname]);
  const isActiveSection = (href: AppSection) => activeHref === href;

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
        className="pointer-events-auto relative mx-auto w-full max-w-[1270px] nav-glass rounded-xl px-3 py-2"
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
          <div className="hidden h-6 w-px md:block" style={{ background: 'linear-gradient(180deg, rgb(var(--color-accent) / 0.15), rgb(var(--color-accent-2) / 0.25), rgb(var(--color-accent) / 0.15))' }} />

          {/* Nav links */}
          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveSection(item.href);

              if (item.subItems) {
                return (
                  <NavDropdown
                    key={item.href}
                    item={item}
                    active={active}
                    transitioning={mapTransitionState.transitioning}
                  />
                );
              }

              return (
                <SectionLink
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  transitionSource={
                    item.href === "/mapa"
                      ? "top-nav-map"
                      : item.href === "/"
                      ? "top-nav-summary"
                      : null
                  }
                  data-map-transition-source={
                    item.href === "/mapa"
                      ? "top-nav-map"
                      : item.href === "/"
                      ? "top-nav-summary"
                      : undefined
                  }
                  data-active={active ? "true" : "false"}
                  className={cn(
                    "group relative inline-flex items-center gap-2 pb-1.5 pt-1 text-sm font-medium transition-colors duration-200",
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
                    aria-hidden="true"
                    className={getNavIndicatorClass(active, mapTransitionState.transitioning)}
                  />
                </SectionLink>
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
              const active = isActiveSection(item.href);

              // Mobile treats subItems as a direct link to the section root
              return (
                <SectionLink
                  key={item.href}
                  href={resolveMobileSectionHref({
                    href: item.href,
                    pathname,
                    subItemHrefs: item.subItems?.map((subItem) => subItem.href)
                  })}
                  prefetch={false}
                  transitionSource={
                    item.href === "/mapa"
                      ? "top-nav-map"
                      : item.href === "/"
                      ? "top-nav-summary"
                      : null
                  }
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
                      ? "border-accent/50 bg-accent/14 text-accent shadow-[inset_0_0_0_1px_rgb(var(--color-accent)/0.18),0_0_10px_rgb(var(--color-accent)/0.1)]"
                      : mapTransitionState.transitioning
                      ? "border-border/70 bg-surface/80 text-muted"
                      : "border-border/60 bg-surface/90 text-muted hover:border-accent/30 hover:bg-accent/8 hover:text-text"
                  )}
                >
                  <span className="inline-flex flex-col items-center gap-1 sm:flex-row">
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
                </SectionLink>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

function NavDropdown({ item, active, transitioning }: { item: NavItem; active: boolean; transitioning: boolean }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const Icon = item.icon;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        data-active={active ? "true" : "false"}
        className={cn(
          "group relative inline-flex items-center gap-1.5 pb-1.5 pt-1 text-sm font-medium transition-colors duration-200 outline-none",
          active
            ? "text-accent"
            : transitioning
            ? "text-muted"
            : "text-muted hover:text-text"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 transition-colors duration-200 motion-reduce:animate-none",
            active
              ? "text-accent"
              : transitioning
              ? ""
              : "group-hover:text-accent",
            transitioning ? "" : iconMotionClassByHref[item.href] ?? ""
          )}
          style={iconStyleByHref[item.href]}
          strokeWidth={active ? 2 : 1.8}
        />
        {item.label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
        <span
          aria-hidden="true"
          className={getNavIndicatorClass(active, transitioning)}
        />
      </button>

      {open && (
        <div className="absolute left-1/2 mt-3 flex w-[240px] -translate-x-1/2 flex-col rounded-2xl border border-border/50 bg-surface/95 p-2 shadow-lg backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
          {item.subItems?.map((sub) => {
            const SubIcon = sub.icon;
            return (
              <SectionLink
                key={sub.href}
                href={sub.href}
                onClick={() => setOpen(false)}
                className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                  <SubIcon className="h-4 w-4 text-muted group-hover:text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">{sub.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{sub.description}</p>
                </div>
              </SectionLink>
            )
          })}
        </div>
      )}
    </div>
  );
}
