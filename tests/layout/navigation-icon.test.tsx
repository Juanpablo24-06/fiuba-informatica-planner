// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NavigationIcon from "@/components/layout/navigation-icon";
import { CALENDAR_PERIOD_MOTION } from "@/lib/calendar-motion";

describe("navigation gesture lifecycle", () => {
  let root: Root;
  let host: HTMLDivElement;
  let media: EventTarget & { matches: boolean };
  let records: { element: Element; frames: Keyframe[]; options: KeyframeAnimationOptions; cancel: ReturnType<typeof vi.fn>; onfinish: (() => void) | null }[];
  const previousAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
  beforeEach(() => {
    records = [];
    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    media = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal("matchMedia", () => media);
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue({ length: 1 } as DOMRectList);
    Object.defineProperty(Element.prototype, "animate", { configurable: true, value: function(this: Element, frames: Keyframe[], options: KeyframeAnimationOptions) {
      const animation = { element: this, frames, options, cancel: vi.fn(), onfinish: null as (() => void) | null };
      records.push(animation); return animation;
    } });
    host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
    host.addEventListener("click", event => event.preventDefault());
  });
  afterEach(() => {
    act(() => root.unmount()); host.remove();
    if (previousAnimate) Object.defineProperty(Element.prototype, "animate", previousAnimate); else Reflect.deleteProperty(Element.prototype, "animate");
    vi.restoreAllMocks(); vi.unstubAllGlobals();
  });
  it("animates the separate tiles slowly and avoids restarting on focus/click", () => {
    act(() => root.render(<a href="#summary"><NavigationIcon href="/"/></a>));
    const link = host.querySelector("a")!;
    act(() => link.dispatchEvent(new Event("pointerenter")));
    expect(records).toHaveLength(4);
    expect(records.every(record => record.options.duration === 620)).toBe(true);
    expect(records.map(record => record.options.delay)).toEqual([0,45,90,135]);
    act(() => { link.dispatchEvent(new Event("focus")); link.dispatchEvent(new Event("click", { cancelable: true })); });
    expect(records).toHaveLength(4);
    records.slice().forEach(record => record.onfinish?.());
    act(() => link.dispatchEvent(new Event("pointerenter")));
    expect(records).toHaveLength(8);
  });
  it("turns the calendar page in the selected direction and cancels for reduced motion", () => {
    act(() => root.render(<a href="/calendario"><NavigationIcon href="/calendario"/></a>));
    act(() => window.dispatchEvent(new CustomEvent(CALENDAR_PERIOD_MOTION, { detail: -1 })));
    expect(records).toHaveLength(1);
    expect(records[0].frames[2].transform).toBe("translate(-3px, 7px) rotate(-16deg)");
    expect(records[0].options.duration).toBe(860);
    act(() => { media.matches = true; media.dispatchEvent(new Event("change")); });
    expect(records[0].cancel).toHaveBeenCalledOnce();
    act(() => window.dispatchEvent(new CustomEvent(CALENDAR_PERIOD_MOTION, { detail: 1 })));
    expect(records).toHaveLength(1);
  });
  it("plays on activation and releases its animations when unmounted", () => {
    act(() => root.render(<a href="/cursos"><NavigationIcon href="/cursos" active/></a>));
    expect(records[0].frames[1].transform).toBe("rotate(-10deg)");
    act(() => root.render(null));
    expect(records[0].cancel).toHaveBeenCalledOnce();
  });
});
