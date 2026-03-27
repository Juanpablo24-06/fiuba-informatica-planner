export const MAP_ENTRY_LOADER_MIN_MS = 900;
const MAP_ENTRY_LOADER_KEY = "fiuba-map-entry-loader";

export const armMapEntryLoader = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    MAP_ENTRY_LOADER_KEY,
    String(Date.now() + MAP_ENTRY_LOADER_MIN_MS)
  );
};

export const clearMapEntryLoader = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(MAP_ENTRY_LOADER_KEY);
};

export const getMapEntryLoaderRemainingMs = () => {
  if (typeof window === "undefined") return 0;

  const rawDeadline = window.sessionStorage.getItem(MAP_ENTRY_LOADER_KEY);
  if (!rawDeadline) return 0;

  const deadline = Number(rawDeadline);
  if (!Number.isFinite(deadline)) {
    clearMapEntryLoader();
    return 0;
  }

  const remaining = Math.max(0, deadline - Date.now());
  if (remaining === 0) {
    clearMapEntryLoader();
  }

  return remaining;
};
