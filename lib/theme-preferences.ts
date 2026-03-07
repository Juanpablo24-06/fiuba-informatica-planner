export type ThemePreference = "light" | "dark" | "system";
export type PalettePreset = "coral" | "esmeralda" | "indigo";
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
  theme: "system",
  palette: "coral",
  density: "media"
};

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

const isPalettePreset = (value: string | null): value is PalettePreset =>
  value === "coral" || value === "esmeralda" || value === "indigo";

const isDensityMode = (value: string | null): value is DensityMode =>
  value === "compacta" || value === "media" || value === "amplia";

export const resolveTheme = (theme: ThemePreference) => {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const getAutoPaletteForTheme = (theme: ThemePreference): PalettePreset =>
  resolveTheme(theme) === "dark" ? "indigo" : "coral";

export const readAppearancePreferences = (): AppearancePreferences => {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;

  const storedTheme = localStorage.getItem(THEME_KEY);
  const storedPalette = localStorage.getItem(PALETTE_KEY);
  const storedDensity = localStorage.getItem(DENSITY_KEY);

  return {
    theme: isThemePreference(storedTheme) ? storedTheme : DEFAULT_APPEARANCE.theme,
    palette: isPalettePreset(storedPalette) ? storedPalette : DEFAULT_APPEARANCE.palette,
    density: isDensityMode(storedDensity) ? storedDensity : DEFAULT_APPEARANCE.density
  };
};

export const applyAppearancePreferences = (preferences: AppearancePreferences) => {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(preferences.theme);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.palette = preferences.palette;
  document.documentElement.dataset.density = preferences.density;
  document.documentElement.style.colorScheme = resolved;
};

export const commitAppearancePreferences = (preferences: AppearancePreferences) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(THEME_KEY, preferences.theme);
    localStorage.setItem(PALETTE_KEY, preferences.palette);
    localStorage.setItem(DENSITY_KEY, preferences.density);
  }

  applyAppearancePreferences(preferences);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<AppearancePreferences>(APPEARANCE_EVENT, {
        detail: preferences
      })
    );
  }

  return preferences;
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
