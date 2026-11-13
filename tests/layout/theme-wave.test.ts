import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

async function scene(reduced = false) {
  const children = new Set<object>();
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  const contexts: Record<string, ReturnType<typeof vi.fn>>[] = [];
  const canvases: { width: number; height: number }[] = [];
  const root = { dataset: {} as Record<string, string> };
  const background = { isConnected: true, querySelectorAll: () => [], appendChild: (canvas: object) => children.add(canvas) };
  const motion = { matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal("window", { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 3, matchMedia: () => motion, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal("document", {
    documentElement: root, querySelector: () => background, querySelectorAll: () => [],
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    createElement: () => {
      const context = Object.fromEntries(["scale", "fillRect", "beginPath", "moveTo", "lineTo", "closePath", "fill", "drawImage"].map(key => [key, vi.fn()]));
      contexts.push(context);
      const canvas = { width: 0, height: 0, dataset: {}, setAttribute: vi.fn(), getContext: () => context, remove: () => children.delete(canvas) };
      canvases.push(canvas);
      return canvas;
    }
  });
  vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "20 20 20" }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  return { ...(await import("@/lib/theme-wave")), children, frames, contexts, canvases, root };
}

describe("background theme wave", () => {
  it("paints a cached organic mask with three composites per frame and bounded layers", async () => {
    const s = await scene();
    const commit = vi.fn();
    s.transitionTheme({ x: 1800, y: 40 }, commit);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(s.children.size).toBe(1);
    const contours = s.contexts.reduce((count, context) => count + context.lineTo.mock.calls.length, 0);
    const draws = s.contexts.reduce((count, context) => count + context.drawImage.mock.calls.length, 0);
    s.frames.values().next().value!(performance.now() + 200);
    expect(s.contexts.reduce((n, ctx) => n + ctx.lineTo.mock.calls.length, 0)).toBe(contours);
    expect(s.contexts.reduce((n, ctx) => n + ctx.drawImage.mock.calls.length, 0)).toBe(draws + 3);
    expect(s.canvases.every(c => c.width * c.height < 1_003_000)).toBe(true);
    expect(s.waveRadius(0, 100)).not.toBe(s.waveRadius(Math.PI, 100));
    s.finishThemeWave();
    expect(s.children.size).toBe(0);
    expect(s.root.dataset.themeWave).toBeUndefined();
  });

  it("commits rapid reversals immediately, takes the visible frame and leaves one wave", async () => {
    const s = await scene();
    const commit = vi.fn();
    s.transitionTheme({ x: 200, y: 40 }, commit);
    const previous = [...s.children][0];
    s.transitionTheme({ x: 300, y: 40 }, commit);
    expect(commit).toHaveBeenCalledTimes(2);
    expect(s.children.size).toBe(1);
    expect(s.children.has(previous)).toBe(false);
    expect(s.contexts.some(ctx => ctx.drawImage.mock.calls.some(call => call[0] === previous))).toBe(true);
    s.finishThemeWave();
    expect(s.frames.size).toBe(0);
  });

  it("honors reduced motion without allocating a painting layer", async () => {
    const s = await scene(true);
    const commit = vi.fn();
    s.transitionTheme({ x: 0, y: 0 }, commit);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(s.canvases).toHaveLength(0);
    expect(s.frames.size).toBe(0);
  });
});
