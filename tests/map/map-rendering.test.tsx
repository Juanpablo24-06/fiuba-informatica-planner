// @vitest-environment jsdom
import React, { act, Profiler } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import MapView from "@/components/map/map-view";
import { MAP_VIEW_STORAGE_KEY } from "@/lib/map/map-constants";
import type { MapNode } from "@/lib/map/types";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear(); });

it("waits for measured camera pixels and zooms without rendering the graph again", () => {
  vi.useFakeTimers();
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let width = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const observers: (() => void)[] = [];
  let frameId = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { frames.set(++frameId, cb); return frameId; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("matchMedia", (query: string) => Object.assign(new EventTarget(), { matches: query.includes("min-width") }));
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { observers.push(callback); }
    observe() {} disconnect() {}
  });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(720);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const ready = vi.fn();
  const commits = vi.fn();
  const storage = vi.spyOn(Storage.prototype, "setItem");
  const nodes: MapNode[] = [{ id: "one", name: "Materia de prueba", code: "TEST", term: 1, term_order: 1, type: "obligatoria", cycle: "grado", status: "cursando" }];
  const paintFrame = () => act(() => {
    const pending = [...frames.entries()];
    for (const [id, cb] of pending) { frames.delete(id); cb(performance.now()); }
  });
  try {
    act(() => root.render(<Profiler id="map" onRender={commits}><MapView nodes={nodes} edges={[]} onReady={ready}/></Profiler>));
    paintFrame();
    expect(ready).not.toHaveBeenCalled();
    width = 1280;
    act(() => observers.forEach(callback => callback()));
    paintFrame();
    expect(ready).not.toHaveBeenCalled();
    paintFrame();
    expect(ready).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(200));
    commits.mockClear(); storage.mockClear();
    const world = host.querySelector<HTMLElement>("[data-map-world]")!;
    const before = world.style.transform;
    act(() => {
      for (let i = 0; i < 20; i++) world.parentElement!.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 30, clientX: 500, clientY: 300 }));
    });
    paintFrame();
    expect(world.style.transform).not.toBe(before);
    expect(commits).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(storage).toHaveBeenCalledTimes(1);
    expect(storage.mock.calls[0][0]).toBe(MAP_VIEW_STORAGE_KEY);
  } finally {
    act(() => root.unmount()); host.remove();
  }
});
