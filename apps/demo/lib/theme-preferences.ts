import { finishThemeWave } from "@/lib/theme-wave";

export type ThemePreference = "light" | "dark" | "system";
export type PalettePreset = "grafito" | "coral" | "esmeralda" | "indigo";
export type DensityMode = "compacta" | "media" | "amplia";

export type AppearancePreferences = {
  theme: ThemePreference;
  palette: PalettePreset;
  density: DensityMode;
};

export const THEME_KEY = "fiuba-theme";
export const PALETTE_KEY = "fiuba-palette";
export const DENSITY_KEY = "fiuba-density";

const APPEARANCE_EVENT = "fiuba:appearance-change";


export const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: "light",
  palette: "coral",
  density: "media"
};

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

const isPalettePreset = (value: string | null): value is PalettePreset =>
  value === "grafito" || value === "coral" || value === "esmeralda" || value === "indigo";

export const resolveTheme = (theme: ThemePreference) => {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const getAutoPaletteForTheme = (theme: ThemePreference): PalettePreset =>
  resolveTheme(theme) === "dark" ? "indigo" : "coral";

export const readAppearancePreferences = (): AppearancePreferences => {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;

  let storedTheme: string | null = null;
  let storedPalette: string | null = null;
  try {
    storedTheme = localStorage.getItem(THEME_KEY);
    storedPalette = localStorage.getItem(PALETTE_KEY);
  } catch { /* Preferences remain usable when storage is blocked. */ }
  return {
    theme: isThemePreference(storedTheme) ? storedTheme : DEFAULT_APPEARANCE.theme,
    palette: isPalettePreset(storedPalette) ? storedPalette : DEFAULT_APPEARANCE.palette,
    density: DEFAULT_APPEARANCE.density
  };
};

export const applyAppearancePreferences = (preferences: AppearancePreferences) => {
  if (typeof document === "undefined") return;
  finishThemeWave();
  const root = document.documentElement;
  const resolved = resolveTheme(preferences.theme);
  root.dataset.theme = resolved;
  root.dataset.palette = preferences.palette;
  root.dataset.density = DEFAULT_APPEARANCE.density;
  root.style.colorScheme = resolved;

};

export const commitAppearancePreferences = (preferences: AppearancePreferences) => {
  if (typeof window !== "undefined") {
    try {
    localStorage.setItem(THEME_KEY, preferences.theme);
    localStorage.setItem(PALETTE_KEY, preferences.palette);
    localStorage.setItem(DENSITY_KEY, DEFAULT_APPEARANCE.density);
    } catch { /* Keep the preference for this visit. */ }
  }

  const normalizedPreferences = {
    ...preferences,
    density: DEFAULT_APPEARANCE.density
  };

  applyAppearancePreferences(normalizedPreferences);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<AppearancePreferences>(APPEARANCE_EVENT, {
        detail: normalizedPreferences
      })
    );
  }

  return normalizedPreferences;
};

export const subscribeToAppearancePreferences = (
  listener: (preferences: AppearancePreferences) => void
) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<AppearancePreferences>).detail;
    if (detail) {
      listener(detail);
    }
  };

  window.addEventListener(APPEARANCE_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(APPEARANCE_EVENT, handler as EventListener);
  };
};
