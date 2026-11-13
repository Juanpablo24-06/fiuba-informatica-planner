import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Palette, User, Check, Eye, ShieldCheck, RotateCcw } from "lucide-react";
import LogoutButton from "@/components/layout/logout-button";
import {
  commitAppearancePreferences,
  readAppearancePreferences,
  subscribeToAppearancePreferences,
  type PalettePreset,
  type ThemePreference
} from "@/lib/theme-preferences";

export type ProfileMenuProps = {
  role?: "admin" | "viewer";
  onRoleChange?: (role: "admin" | "viewer") => void;
  onReset?: () => void;
};
export default function ProfileMenu({ role, onRoleChange, onReset }: ProfileMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>("light");
  const [palette, setPalette] = useState<PalettePreset>("coral");

  const roleLabel = useMemo(
    () => (role === "admin" ? "Administrador" : "Visualizador · Solo lectura"),
    [role]
  );

  useEffect(() => {
    const next = readAppearancePreferences();
    setTheme(next.theme);
    setPalette(next.palette);

    const unsubscribe = subscribeToAppearancePreferences((value) => {
      setTheme(value.theme);
      setPalette(value.palette);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const updatePalette = (next: PalettePreset) => {
    const nextPreferences = commitAppearancePreferences({
      theme,
      palette: next,
      density: "media"
    });
    setPalette(nextPreferences.palette);
  };

  return (
    <div ref={containerRef} className="relative z-[70]" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button
        type="button"
        ref={triggerRef}
        aria-label="Perfil"
        aria-expanded={open}
        aria-controls="header-profile-panel"
        onClick={() => setOpen((prev) => !prev)}
        className="header-profile-trigger flex items-center gap-2 px-0 py-1 text-sm font-semibold text-text transition-colors duration-200 hover:text-accent"
      >
        <User className="header-profile-icon h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Perfil</span>
        <ChevronDown className="h-4 w-4 text-muted transition-transform duration-200 motion-reduce:transition-none" style={{ transform: open ? "rotate(180deg)" : undefined }} aria-hidden="true" />
      </button>

      {open ? (
        <div id="header-profile-panel" className="dropdown-surface absolute right-0 z-[80] mt-3 w-[300px] max-w-[calc(100vw-2rem)] rounded-3xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <Image
              src="/avatar-generico.svg"
              alt="Avatar genérico"
              width={40}
              height={40}
              className="rounded-full border border-border/60"
            />
            <div>
              <p className="text-sm font-semibold text-text">Plan Ing Informática</p>
              <p className="text-xs text-muted">Rol actual: {roleLabel}</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {onRoleChange ? <fieldset className="space-y-1.5 border-b border-border/50 pb-4">
              <legend className="mb-2 font-semibold text-text">Cambiar perfil</legend>
              {([['viewer', 'Visualizador', Eye], ['admin', 'Administrador', ShieldCheck]] as const).map(([value, label, Icon]) => <button key={value} type="button" aria-pressed={role === value} onClick={() => { if (role !== value) onRoleChange(value); setOpen(false); triggerRef.current?.focus(); }} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${role === value ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface-2'}`}><Icon className="h-4 w-4"/><span className="flex-1 font-semibold">{label}</span>{role === value ? <Check className="h-3.5 w-3.5"/> : null}</button>)}
              <p className="px-1 pt-1 text-[11px] leading-relaxed text-muted">Mismos datos ficticios, distintos permisos. Tus cambios se guardan en este navegador.</p>
            </fieldset> : null}
            <div>
              <p className="mb-2 flex items-center gap-2 font-semibold text-text">
                <Palette className="h-3.5 w-3.5" /> Paleta
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "grafito", label: "Grafito" },
                    { id: "coral", label: "Coral" },
                    { id: "esmeralda", label: "Esmeralda" },
                    { id: "indigo", label: "Índigo" }
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updatePalette(item.id)}
                    aria-pressed={palette === item.id}
                    className={`rounded-xl border px-3 py-1.5 font-semibold ${
                      palette === item.id
                        ? "border-accent/40 bg-accent text-accent-contrast"
                        : "border-border/70 bg-surface-2/60 text-muted"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border/60 pt-3">
              {onReset ? <button type="button" onClick={() => { setOpen(false); onReset(); }} className="mb-3 flex items-center gap-2 text-muted hover:text-accent"><RotateCcw className="h-3.5 w-3.5"/>Restablecer demo</button> : null}
              <div className="flex justify-end">
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
