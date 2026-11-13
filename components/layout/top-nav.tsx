"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { useMapTransitionState } from "@/components/layout/map-transition-coordinator";
import SectionLink from "@/components/layout/section-link";
import { resolveMobileSectionHref } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/layout/brand-logo";
import ProfileMenu, { type ProfileMenuProps } from "@/components/layout/profile-menu";
import ThemeToggle from "@/components/layout/theme-toggle";
import NavigationIcon from "@/components/layout/navigation-icon";
import { getDisplaySection, type AppSection } from "@/components/layout/map-transition-store";

type NavItem = {
  href: AppSection;
  label: string;
};

const baseItems: NavItem[] = [
  { href: "/", label: "Resumen" },
  { href: "/mapa", label: "Mapa" },
  { href: "/cursos", label: "Cursos" },
  { href: "/planificar", label: "Planificar" },
  { href: "/calendario", label: "Calendario" }
];

const getNavIndicatorClass = (active: boolean, transitioning: boolean) =>
  cn(
    "pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-center rounded-full bg-accent shadow-[0_0_12px_rgb(var(--color-accent)/0.28)] transition-transform duration-200",
    active
      ? "scale-x-100"
      : transitioning
      ? "scale-x-0"
      : "scale-x-0 group-hover:scale-x-100"
  );

export default function TopNav({ role, onRoleChange, onReset }: ProfileMenuProps) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement | null>(null);
  const mapTransitionState = useMapTransitionState();
  const navItems: NavItem[] = role === "admin"
    ? [...baseItems, { href: "/admin", label: "Admin" }]
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
      className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-2.5 sm:px-4 2xl:px-6"
      data-scrollbar-compensate="true"
      style={{ "--scrollbar-compensation-base-padding": "16px" } as CSSProperties}
    >
      <div
        className="pointer-events-auto relative mx-auto w-full max-w-[1680px] nav-glass rounded-xl px-3 py-2 2xl:px-4"
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
          <div className="hidden h-6 w-px lg:block" style={{ background: 'linear-gradient(180deg, rgb(var(--color-accent) / 0.15), rgb(var(--color-accent-2) / 0.25), rgb(var(--color-accent) / 0.15))' }} />

          {/* Nav links */}
          <nav className="hidden items-center gap-5 lg:flex 2xl:gap-9">
            {navItems.map((item) => {
              const active = isActiveSection(item.href);

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
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative inline-flex items-center gap-2 pb-1.5 pt-1 text-sm font-medium transition-colors duration-200",
                    active
                      ? "text-accent"
                      : mapTransitionState.transitioning
                      ? "text-muted"
                      : "text-muted hover:text-text"
                  )}
                  >
                  <NavigationIcon
                    href={item.href}
                    active={active}
                    className={cn(
                      "h-4 w-4 transition-colors duration-200",
                      active
                        ? "text-accent"
                        : mapTransitionState.transitioning
                        ? ""
                        : "group-hover:text-accent"
                    )}
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
            <ProfileMenu role={role} onRoleChange={onRoleChange} onReset={onReset} />
          </div>
        </div>

        <div className="mt-2 border-t border-border/50 pt-2 lg:hidden">
          <nav className={cn("grid gap-1 sm:gap-2", navItems.length > 5 ? "grid-cols-6" : navItems.length >= 5 ? "grid-cols-5" : navItems.length >= 4 ? "grid-cols-4" : "grid-cols-3")}>
            {navItems.map((item) => {
              const active = isActiveSection(item.href);

                  return (
                <SectionLink
                  key={item.href}
                  href={resolveMobileSectionHref({ href: item.href, pathname })}
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
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group rounded-2xl border px-1 py-2 text-center text-[10px] sm:text-xs font-semibold transition-all duration-200",
                    active
                      ? "border-accent/50 bg-accent/14 text-accent shadow-[inset_0_0_0_1px_rgb(var(--color-accent)/0.18),0_0_10px_rgb(var(--color-accent)/0.1)]"
                      : mapTransitionState.transitioning
                      ? "border-border/70 bg-surface/80 text-muted"
                      : "border-border/60 bg-surface/90 text-muted hover:border-accent/30 hover:bg-accent/8 hover:text-text"
                  )}
                >
                  <span className="inline-flex flex-col items-center gap-1 sm:flex-row">
                    <NavigationIcon
                      href={item.href}
                      active={active}
                      className={cn(
                        "h-3.5 w-3.5 transition-colors duration-200",
                        active ? "text-accent" : ""
                      )}
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
