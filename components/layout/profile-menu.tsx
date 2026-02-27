"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Palette, SunMoon, SwatchBook } from "lucide-react";

type ThemePreference = "light" | "dark" | "system";
type PalettePreset = "coral" | "esmeralda" | "indigo";
type DensityMode = "compacta" | "media" | "amplia";

const THEME_KEY = "fiuba-theme";
const PALETTE_KEY = "fiuba-palette";
const DENSITY_KEY = "fiuba-density";

const resolveTheme = (theme: ThemePreference) =>
  theme === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : theme;

const applyPreferences = (
  theme: ThemePreference,
  palette: PalettePreset,
  density: DensityMode
) => {
  const resolvedTheme = resolveTheme(theme);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.palette = palette;
  document.documentElement.dataset.density = density;
  document.documentElement.style.colorScheme = resolvedTheme;
};

export default function ProfileMenu({ role }: { role?: "admin" | "viewer" }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isTransitioning = useRef(false);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [palette, setPalette] = useState<PalettePreset>("coral");
  const [density, setDensity] = useState<DensityMode>("media");

  const roleLabel = useMemo(() => (role === "admin" ? "Admin" : "Visualización (solo lectura)"), [role]);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    const storedPalette = localStorage.getItem(PALETTE_KEY);
    const storedDensity = localStorage.getItem(DENSITY_KEY);

    const nextTheme =
      storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
        ? storedTheme
        : "system";
    const nextPalette =
      storedPalette === "coral" || storedPalette === "esmeralda" || storedPalette === "indigo"
        ? storedPalette
        : "coral";
    const nextDensity =
      storedDensity === "compacta" || storedDensity === "media" || storedDensity === "amplia"
        ? storedDensity
        : "media";

    setTheme(nextTheme);
    setPalette(nextPalette);
    setDensity(nextDensity);
    applyPreferences(nextTheme, nextPalette, nextDensity);
  }, []);

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (isTransitioning.current) return;
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, []);

  useEffect(() => {
    const handleSystemChange = () => {
      applyPreferences(theme, palette, density);
    };
    if (theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", handleSystemChange);
    return () => query.removeEventListener("change", handleSystemChange);
  }, [theme, palette, density]);

  const updateTheme = (next: ThemePreference, event?: React.MouseEvent) => {
    // Auto-switch palette based on theme
    const resolved = resolveTheme(next);
    const autoPalette: PalettePreset = resolved === "dark" ? "indigo" : "coral";
    setPalette(autoPalette);
    localStorage.setItem(PALETTE_KEY, autoPalette);

    if (!document.startViewTransition || !event) {
      setTheme(next);
      localStorage.setItem(THEME_KEY, next);
      applyPreferences(next, autoPalette, density);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );

    const isDark = resolved === "dark";

    isTransitioning.current = true;

    try {
      document.body.classList.add("theme-transitioning");

      const transition = document.startViewTransition(() => {
        setTheme(next);
        localStorage.setItem(THEME_KEY, next);
        applyPreferences(next, autoPalette, density);
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

      transition.finished.then(() => {
        isTransitioning.current = false;
        document.body.classList.remove("theme-transitioning");
      });
    } catch {
      // Fallback if view transition fails
      setTheme(next);
      localStorage.setItem(THEME_KEY, next);
      applyPreferences(next, autoPalette, density);
      isTransitioning.current = false;
    }
  };

  const updatePalette = (next: PalettePreset) => {
    setPalette(next);
    localStorage.setItem(PALETTE_KEY, next);
    applyPreferences(theme, next, density);
  };

  const updateDensity = (next: DensityMode) => {
    setDensity(next);
    localStorage.setItem(DENSITY_KEY, next);
    applyPreferences(theme, palette, next);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-border/70 bg-surface px-2 py-1.5"
      >
        <Image
          src="/avatar-generico.svg"
          alt="Perfil"
          width={34}
          height={34}
          className="rounded-full border border-border/60"
        />
        <span className="hidden text-xs font-semibold text-text sm:inline">Perfil</span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[300px] rounded-2xl border border-border/70 bg-surface p-4 shadow-glow">
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
                <SunMoon className="h-3.5 w-3.5" /> Tema
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["light", "dark", "system"] as ThemePreference[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTheme(value, e);
                    }}
                    className={`rounded-full border px-3 py-1.5 font-semibold ${theme === value
                      ? "border-accent/40 bg-accent text-accent-contrast"
                      : "border-border/70 bg-surface-2/60 text-muted"
                      }`}
                  >
                    {value === "light" ? "Claro" : value === "dark" ? "Oscuro" : "Sistema"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 font-semibold text-text">
                <Palette className="h-3.5 w-3.5" /> Paleta
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "coral", label: "Coral" },
                    { id: "esmeralda", label: "Esmeralda" },
                    { id: "indigo", label: "Índigo" }
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updatePalette(item.id)}
                    className={`rounded-full border px-3 py-1.5 font-semibold ${palette === item.id
                      ? "border-accent/40 bg-accent text-accent-contrast"
                      : "border-border/70 bg-surface-2/60 text-muted"
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 font-semibold text-text">
                <SwatchBook className="h-3.5 w-3.5" /> Densidad
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "compacta", label: "Compacta" },
                    { id: "media", label: "Media" },
                    { id: "amplia", label: "Amplia" }
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateDensity(item.id)}
                    className={`rounded-full border px-3 py-1.5 font-semibold ${density === item.id
                      ? "border-accent/40 bg-accent text-accent-contrast"
                      : "border-border/70 bg-surface-2/60 text-muted"
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
