import { afterEach, describe, expect, it, vi } from "vitest";
import { createCameraScheduler } from "@/lib/map/map-camera-scheduler";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("camera scheduling", () => {
  function setup() {
    vi.useFakeTimers();
    const frames = new Map<number, FrameRequestCallback>();
    let id = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
    vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
    const paint = vi.fn();
    const persist = vi.fn();
    const scheduler = createCameraScheduler({ paint, persist });
    return { frames, paint, persist, scheduler };
  }

  it("coalesces a pointer burst into one paint and persists only after idle", () => {
    const { frames, paint, persist, scheduler } = setup();
    for (let x = 0; x < 100; x++) scheduler.schedule({ x, y: 2, scale: 0.8 });
    expect(frames.size).toBe(1);
    expect(persist).not.toHaveBeenCalled();
    frames.values().next().value!(16);
    expect(paint).toHaveBeenCalledExactlyOnceWith({ x: 99, y: 2, scale: 0.8 });
    vi.advanceTimersByTime(199);
    expect(persist).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(persist).toHaveBeenCalledExactlyOnceWith({ x: 99, y: 2, scale: 0.8 });
    scheduler.dispose();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("saves the latest camera on navigation and cancels pending work", () => {
    const { frames, paint, persist, scheduler } = setup();
    scheduler.schedule({ x: 40, y: 80, scale: 1 });
    scheduler.dispose();
    expect(frames.size).toBe(0);
    vi.runAllTimers();
    expect(paint).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledExactlyOnceWith({ x: 40, y: 80, scale: 1 });
  });
});
