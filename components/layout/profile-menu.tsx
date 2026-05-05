"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Palette, User } from "lucide-react";
import LogoutButton from "@/components/layout/logout-button";
import {
  applyAppearancePreferences,
  commitAppearancePreferences,
  readAppearancePreferences,
  subscribeToAppearancePreferences,
  type PalettePreset,
  type ThemePreference
} from "@/lib/theme-preferences";

export default function ProfileMenu({ role }: { role?: "admin" | "viewer" }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [palette, setPalette] = useState<PalettePreset>("coral");

  const roleLabel = useMemo(
    () => (role === "admin" ? "Admin" : "Visualización (solo lectura)"),
    [role]
  );

  useEffect(() => {
    const next = readAppearancePreferences();
    setTheme(next.theme);
    setPalette(next.palette);
    applyAppearancePreferences(next);

    const unsubscribe = subscribeToAppearancePreferences((value) => {
      setTheme(value.theme);
      setPalette(value.palette);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const updatePalette = (next: PalettePreset) => {
    const nextPreferences = commitAppearancePreferences({
      theme,
      palette: next,
      density: "media"
    });
    setPalette(nextPreferences.palette);
  };

  return (
    <div ref={containerRef} className="relative z-[70]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-0 py-1 text-sm font-semibold text-text transition-colors duration-200 hover:text-accent"
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">Perfil</span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>

      {open ? (
        <div className="absolute right-0 z-[80] mt-3 w-[300px] rounded-2xl border border-border/70 bg-surface p-4 shadow-glow">
          <div className="mb-4 flex items-center gap-3">
            <Image
              src="/avatar-generico.svg"
              alt="Avatar genérico"
              width={40}
              height={40}
              className="rounded-full border border-border/60"
            />
            <div>
              <p className="text-sm font-semibold text-text">Plan Ing Informática</p>
              <p className="text-xs text-muted">Rol actual: {roleLabel}</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <p className="mb-2 flex items-center gap-2 font-semibold text-text">
                <Palette className="h-3.5 w-3.5" /> Paleta
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "grafito", label: "Grafito" },
                    { id: "coral", label: "Coral" },
                    { id: "esmeralda", label: "Esmeralda" },
                    { id: "indigo", label: "Índigo" }
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updatePalette(item.id)}
                    className={`rounded-xl border px-3 py-1.5 font-semibold ${
                      palette === item.id
                        ? "border-accent/40 bg-accent text-accent-contrast"
                        : "border-border/70 bg-surface-2/60 text-muted"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border/60 pt-3">
              <div className="flex justify-end">
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
