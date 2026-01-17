import Link from "next/link";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/layout/logout-button";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/mapa", label: "Mapa" }
];

export default function TopNav({ role }: { role?: "admin" | "viewer" }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-canvas/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-surface/80 shadow-glow">
            <span className="text-xs font-semibold tracking-[0.2em] text-accent">FI</span>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted">Plan 2023</p>
            <h1 className="text-lg font-semibold">Planificador FIUBA</h1>
          </div>
        </div>
        <nav className="hidden items-center gap-3 text-sm md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full border border-transparent px-3 py-1.5 text-muted transition hover:border-border/60 hover:text-text"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-border/60 px-3 py-1 text-xs text-muted md:flex">
            Rol: <span className="ml-2 font-semibold text-text">{role === "admin" ? "Admin" : "Usuario"}</span>
          </div>
          <LogoutButton />
        </div>
      </div>
      <nav className="flex items-center justify-center gap-3 border-t border-border/60 bg-surface/70 px-6 py-3 text-xs md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn("rounded-full border border-border/50 px-3 py-1 text-muted")}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
