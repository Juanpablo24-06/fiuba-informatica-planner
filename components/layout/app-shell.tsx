"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isMapa = pathname.startsWith("/mapa");

  return (
    <main
      className={cn(
        "mx-auto w-full px-6 pb-28 pt-8",
        isMapa ? "max-w-none px-0 pb-0 pt-0" : "max-w-7xl"
      )}
    >
      {children}
    </main>
  );
}
