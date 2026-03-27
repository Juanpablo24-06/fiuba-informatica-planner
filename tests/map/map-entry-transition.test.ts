import { afterEach, describe, expect, it, vi } from "vitest";
import {
  armMapEntryLoader,
  clearMapEntryLoader,
  getMapEntryLoaderRemainingMs,
  MAP_ENTRY_LOADER_MIN_MS
} from "@/lib/map/map-entry-transition";

describe("map entry transition helpers", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it("tracks remaining loader time from the original click", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T14:00:00.000Z"));

    armMapEntryLoader();

    expect(getMapEntryLoaderRemainingMs()).toBe(MAP_ENTRY_LOADER_MIN_MS);

    vi.advanceTimersByTime(350);
    expect(getMapEntryLoaderRemainingMs()).toBe(MAP_ENTRY_LOADER_MIN_MS - 350);

    vi.advanceTimersByTime(MAP_ENTRY_LOADER_MIN_MS);
    expect(getMapEntryLoaderRemainingMs()).toBe(0);
  });

  it("can clear the loader explicitly after the overlay finishes", () => {
    armMapEntryLoader();
    expect(getMapEntryLoaderRemainingMs()).toBeGreaterThan(0);

    clearMapEntryLoader();

    expect(getMapEntryLoaderRemainingMs()).toBe(0);
  });

  it("keeps a fixed minimum display window for the map loader", () => {
    expect(MAP_ENTRY_LOADER_MIN_MS).toBeGreaterThanOrEqual(700);
  });
});
