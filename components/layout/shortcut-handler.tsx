"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { armMapEntryLoader } from "@/lib/map/map-entry-transition";

const isTypingTarget = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
};

export default function ShortcutHandler() {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey || isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "d") {
        router.push("/");
      }
      if (key === "m") {
        armMapEntryLoader();
        router.push("/mapa");
      }
      if (key === "h") {
        router.push("/horario");
      }
      if (key === "l") {
        router.push("/login");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
