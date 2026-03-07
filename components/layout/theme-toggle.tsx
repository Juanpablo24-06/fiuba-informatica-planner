"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
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

  const handleToggle = () => {
    if (!preferences) return;

    const nextPreferences: AppearancePreferences = {
      ...preferences,
      theme: nextTheme,
      palette: getAutoPaletteForTheme(nextTheme)
    };

    commitThemeChange(nextPreferences);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={`Cambiar a modo ${nextLabel}`}
      aria-label={`Cambiar a modo ${nextLabel}`}
      aria-pressed={resolvedTheme === "dark"}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition-all duration-200 hover:bg-surface-2/65 hover:text-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
