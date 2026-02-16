"use client";

import { useEffect, useMemo, useState } from "react";

type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "fiuba-theme";

const resolveTheme = (preference: ThemePreference) => {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export default function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  const preferenceLabel = useMemo(() => {
    if (preference === "light") return "Claro";
    if (preference === "dark") return "Oscuro";
    return "Sistema";
  }, [preference]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setPreference(stored);
      return;
    }
    setPreference("system");
  }, []);

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(preference);
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    apply();

    if (preference !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [preference]);

  const handleChange = (next: ThemePreference) => {
    setPreference(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const cycleTheme = () => {
    const next =
      preference === "light" ? "dark" : preference === "dark" ? "system" : "light";
    handleChange(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={cycleTheme}
        className="rounded-full border border-border/70 bg-surface px-3 py-1.5 text-[11px] font-semibold text-text sm:hidden"
      >
        {preferenceLabel}
      </button>
      <div className="hidden items-center gap-1 rounded-full border border-border/70 bg-surface px-1 py-1 sm:flex">
        {(["light", "dark", "system"] as ThemePreference[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handleChange(option)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
              preference === option
                ? "bg-accent text-accent-contrast"
                : "text-muted hover:bg-surface-2 hover:text-text"
            }`}
            aria-label={`Cambiar tema a ${option}`}
            aria-pressed={preference === option}
          >
            {option === "light" ? "Claro" : option === "dark" ? "Oscuro" : "Sistema"}
          </button>
        ))}
        <span className="sr-only">Tema actual: {preferenceLabel}</span>
      </div>
    </>
  );
}
