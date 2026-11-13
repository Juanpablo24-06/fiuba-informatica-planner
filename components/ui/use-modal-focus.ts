"use client";

import { useEffect, useRef } from "react";

/** Keyboard containment for the existing custom drawers; restores the trigger. */
export function useModalFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open || !ref.current) return;
    const root = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex="0"]'
    )).filter((element) => element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => focusable()[0]?.focus());
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close.current(); }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0]; const last = items.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", handler, true); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [open]);
  return ref;
}
