import type { Transform } from "./types";

/** Camera pixels are imperative; React owns selection and academic data only. */
export function createCameraScheduler({
  paint,
  persist
}: {
  paint: (transform: Transform) => void;
  persist: (transform: Transform) => void;
}) {
  let pending: Transform | null = null;
  let dirty = false;
  let frame: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    clearTimeout(timer);
    if (pending && dirty) {
      persist(pending);
      dirty = false;
    }
  };
  return {
    schedule(next: Transform) {
      pending = next;
      dirty = true;
      if (frame === null) {
        frame = requestAnimationFrame(() => {
          frame = null;
          if (pending) paint(pending);
        });
      }
      clearTimeout(timer);
      timer = setTimeout(flush, 200);
    },
    dispose() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      flush();
    }
  };
}
