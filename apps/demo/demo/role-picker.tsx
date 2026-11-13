import { useEffect, useState, type ChangeEvent } from 'react';
import { ArrowRight, Check, Eye, ShieldCheck, SunMedium, MoonStar } from 'lucide-react';
import BrandLogo from '../components/layout/brand-logo';
import MapRouteIllustration from '../components/map/map-route-illustration';
import { commitAppearancePreferences, readAppearancePreferences, resolveTheme, subscribeToAppearancePreferences } from '../lib/theme-preferences';
import { transitionTheme } from '../lib/theme-wave';

export default function RolePicker({ onConfirm }: { onConfirm: (role: 'admin' | 'viewer') => void }) {
  const [selected, select] = useState<'admin' | 'viewer'>('viewer');
  const [appearance, setAppearance] = useState(readAppearancePreferences);
  useEffect(() => subscribeToAppearancePreferences(setAppearance), []);
  const resolvedTheme = resolveTheme(appearance.theme);
  const changeTheme = (theme: 'light' | 'dark', event: ChangeEvent<HTMLInputElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const click = event.nativeEvent as MouseEvent;
    const origin = click.detail > 0 ? { x: click.clientX, y: click.clientY } : { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    transitionTheme(origin, () => setAppearance(commitAppearancePreferences({ ...appearance, theme })));
  };
  return <main className="demo-access">
    <div className="demo-access-brand"><BrandLogo/><span>FIUBA <span className="text-muted">/ Plan 2023</span></span><span className="demo-badge">Demo pública</span></div>
    <div className="demo-access-content">
      <section className="demo-access-intro">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-accent">Tu próximo paso, más claro</p>
        <h1>Un lugar para<br/> pensar tu<br/> <span className="text-accent">recorrido.</span></h1>
        <MapRouteIllustration className="demo-access-network"/>
      </section>
      <form className="demo-access-form" onSubmit={(event) => { event.preventDefault(); onConfirm(selected); }}>
        <h2 className="text-2xl font-semibold tracking-tight">Elegí cómo entrar</h2>
        <p className="mt-2 text-sm text-muted">Sin cuenta ni contraseña.</p>
        <fieldset className="demo-role-options"><legend className="sr-only">Perfil de demostración</legend>
          {([{ role: 'viewer', label: 'Visualizador', description: 'Explorá el plan, las materias y el calendario.', icon: Eye }, { role: 'admin', label: 'Administrador', description: 'Editá datos y probá tus propias alternativas.', icon: ShieldCheck }] as const).map(({ role, label, description, icon: Icon }) =>
            <label key={role} className="demo-role-option" data-selected={selected === role}>
              <input className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" type="radio" name="role" value={role} checked={selected === role} onChange={() => select(role)}/>
              <Icon className="h-5 w-5 shrink-0 text-accent" aria-hidden/>
              <span className="demo-role-copy flex-1"><span className="block text-sm font-semibold">{label}</span><span className="demo-role-description mt-1 block text-xs leading-relaxed text-muted"><span className="demo-role-copy-full">{description}</span><span className="demo-role-copy-short">{role === 'viewer' ? 'Solo lectura' : 'Podés editar'}</span></span></span>
              <span className="demo-role-check" aria-hidden>{selected === role ? <Check className="h-3.5 w-3.5"/> : null}</span>
            </label>)}
        </fieldset>
        <div className="demo-appearance">
          <fieldset><legend className="demo-appearance-label">A tu manera</legend>
            <div className="demo-theme-options">
              {([{ id: 'light', label: 'Claro', Icon: SunMedium }, { id: 'dark', label: 'Oscuro', Icon: MoonStar }] as const).map(({ id, label, Icon }) =>
                <label key={id} className="demo-theme-option" data-selected={resolvedTheme === id}>
                  <input type="radio" name="appearance-theme" value={id} checked={resolvedTheme === id} onChange={(event) => changeTheme(id, event)}/>
                  <Icon className="h-4 w-4" aria-hidden/><span>{label}</span>
                </label>)}
            </div>
          </fieldset>
          <fieldset><legend className="demo-appearance-label">Paleta</legend>
            <div className="demo-palette-options">
              {([{ id: 'coral', label: 'Coral' }, { id: 'esmeralda', label: 'Esmeralda' }, { id: 'indigo', label: 'Índigo' }, { id: 'grafito', label: 'Grafito' }] as const).map(({ id, label }) =>
                <label key={id} className="demo-palette-option" data-selected={appearance.palette === id}>
                  <input type="radio" name="appearance-palette" value={id} checked={appearance.palette === id} onChange={() => setAppearance(commitAppearancePreferences({ ...appearance, palette: id }))}/>
                  <span className="demo-palette-swatch" data-palette={id} data-theme={resolvedTheme} aria-hidden>
                    <i/><i/><i/>{appearance.palette === id ? <Check className="h-3 w-3"/> : null}
                  </span><span>{label}</span>
                </label>)}
            </div>
          </fieldset>
        </div>
        <button type="submit" className="demo-enter flex w-full items-center justify-between rounded-2xl bg-accent px-5 text-sm font-semibold text-accent-contrast">Confirmar y entrar <ArrowRight className="h-4 w-4" aria-hidden/></button>
      </form>
    </div>
    <footer className="demo-access-footer"><span>Datos ficticios. Cambios guardados solo en tu navegador.</span><a href="https://github.com/Juanpablo24-06/fiuba-informatica-planner" target="_blank" rel="noreferrer">Explorá el proyecto ↗</a></footer>
  </main>;
}
