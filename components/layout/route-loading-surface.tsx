"use client";

import { usePathname } from "next/navigation";
import AdminLoadingSurface from "@/components/layout/admin-loading-surface";
import AppLoadingSurface from "@/components/layout/app-loading-surface";
import HorarioLoadingSurface from "@/components/layout/horario-loading-surface";
import MapLoadingStage from "@/components/map/map-loading-stage";

type RouteLoadingSurfaceProps = {
  className?: string;
  pathnameOverride?: string;
};

export const getLoadingSurfacePathname = (pathname: string) => {
  if (pathname.startsWith("/mapa")) return "/mapa";
  if (pathname.startsWith("/admin")) return "/admin";
  if (pathname.startsWith("/agenda") || pathname.startsWith("/horario")) {
    return "/agenda";
  }
  return "/";
};

export default function RouteLoadingSurface({
  className,
  pathnameOverride
}: RouteLoadingSurfaceProps) {
  const pathname = usePathname();
  const effectivePathname = pathnameOverride ?? pathname ?? "/";

  switch (getLoadingSurfacePathname(effectivePathname)) {
    case "/mapa":
      return <MapLoadingStage />;
    case "/admin":
      return <AdminLoadingSurface className={className} />;
    case "/agenda":
      return <HorarioLoadingSurface className={className} />;
    default:
      return <AppLoadingSurface className={className} />;
  }
}
