// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyAppearancePreferences,
  commitAppearancePreferences,
  readAppearancePreferences,
  THEME_KEY,
  PALETTE_KEY,
  DENSITY_KEY
} from "@/lib/theme-preferences";

describe("theme preferences", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-palette");
    document.documentElement.removeAttribute("data-density");
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to the coral palette and fixed medium density when no preference is stored", () => {
    expect(readAppearancePreferences()).toMatchObject({
      theme: "light",
      palette: "coral",
      density: "media"
    });
  });

  it("keeps legacy palette values readable while forcing medium density", () => {
    localStorage.setItem(THEME_KEY, "dark");
    localStorage.setItem(PALETTE_KEY, "coral");
    localStorage.setItem(DENSITY_KEY, "amplia");

    expect(readAppearancePreferences()).toMatchObject({
      theme: "dark",
      palette: "coral",
      density: "media"
    });

    commitAppearancePreferences({
      theme: "dark",
      palette: "grafito",
      density: "amplia"
    });

    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(localStorage.getItem(PALETTE_KEY)).toBe("grafito");
    expect(localStorage.getItem(DENSITY_KEY)).toBe("media");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.palette).toBe("grafito");
    expect(document.documentElement.dataset.density).toBe("media");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("applies the resolved theme and graphite palette immediately", () => {
    applyAppearancePreferences({
      theme: "light",
      palette: "grafito",
      density: "amplia"
    });

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.palette).toBe("grafito");
    expect(document.documentElement.dataset.density).toBe("media");
  });
});
