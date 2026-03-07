"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import {
  commitAppearancePreferences,
  getAutoPaletteForTheme,
  readAppearancePreferences,
  resolveTheme,
  subscribeToAppearancePreferences,
  type AppearancePreferences,
  type ThemePreference
} from "@/lib/theme-preferences";

const getToggleTheme = (resolvedTheme: "light" | "dark"): ThemePreference =>
  resolvedTheme === "dark" ? "light" : "dark";

export default function ThemeToggle({ className }: { className?: string }) {
  const [preferences, setPreferences] = useState<AppearancePreferences | null>(null);
  const transitionGuardRef = useRef(false);

  useEffect(() => {
    const next = readAppearancePreferences();
    setPreferences(next);

    const unsubscribe = subscribeToAppearancePreferences((value) => {
      setPreferences(value);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!preferences || preferences.theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      setPreferences((current) => (current ? { ...current } : current));
    };
    query.addEventListener("change", handleSystemChange);
    return () => query.removeEventListener("change", handleSystemChange);
  }, [preferences]);

  const resolvedTheme = preferences ? resolveTheme(preferences.theme) : "light";
  const nextTheme = getToggleTheme(resolvedTheme);
  const nextLabel = nextTheme === "dark" ? "oscuro" : "claro";
  const Icon = nextTheme === "dark" ? MoonStar : SunMedium;

  const commitThemeChange = (nextPreferences: AppearancePreferences) => {
    setPreferences(commitAppearancePreferences(nextPreferences));
  };

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (!preferences || transitionGuardRef.current) return;

    const nextPreferences: AppearancePreferences = {
      ...preferences,
      theme: nextTheme,
      palette: getAutoPaletteForTheme(nextTheme)
    };

    if (!document.startViewTransition) {
      commitThemeChange(nextPreferences);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );

    transitionGuardRef.current = true;
    document.body.classList.add("theme-transitioning");

    try {
      const transition = document.startViewTransition(() => {
        commitThemeChange(nextPreferences);
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`
            ]
          },
          {
            duration: 800,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            pseudoElement: "::view-transition-new(root)"
          }
        );
      });

      transition.finished.finally(() => {
        transitionGuardRef.current = false;
        document.body.classList.remove("theme-transitioning");
      });
    } catch {
      commitThemeChange(nextPreferences);
      transitionGuardRef.current = false;
      document.body.classList.remove("theme-transitioning");
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={`Cambiar a modo ${nextLabel}`}
      aria-label={`Cambiar a modo ${nextLabel}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-2 text-xs font-semibold text-text transition hover:border-accent/60 hover:text-accent",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span>Tema</span>
    </button>
  );
}
