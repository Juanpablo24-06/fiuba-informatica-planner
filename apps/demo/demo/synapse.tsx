import { useState, type ReactNode } from 'react';
import { ArrowUp, ExternalLink, Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '../components/ui/dialog';

export default function DemoSynapse({ trigger }: { role?: 'admin' | 'viewer'; trigger?: ReactNode }) {
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState(false);
  const submit = () => { if (draft.trim()) setNotice(true); };
  return <Dialog>
    <DialogTrigger asChild>{trigger ?? <button>Consultá a Synapse</button>}</DialogTrigger>
    <DialogContent className="demo-synapse flex max-h-[85dvh] max-w-2xl flex-col gap-6 p-5 sm:p-7">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent"><Sparkles className="h-5 w-5"/></span>
        <div className="flex-1"><DialogTitle>Synapse IA</DialogTitle><DialogDescription className="text-xs">Tu espacio para pensar el próximo paso</DialogDescription></div>
        <DialogClose className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Cerrar Synapse"><X className="h-4 w-4"/></DialogClose>
      </header>
      <div className="min-h-[150px] flex-1 overflow-y-auto py-5">
        <p className="text-xl font-semibold">¿Qué te gustaría explorar?</p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">Materias, correlativas, horarios o tu próxima cursada. La interfaz está lista para sumar inteligencia a tu recorrido.</p>
        {notice ? <div role="status" className="mt-6 rounded-2xl border border-accent/20 bg-accent/5 p-4 text-sm leading-relaxed"><p className="font-semibold">La IA todavía no está conectada</p><p className="mt-2 text-muted">Esta versión es una demostración. Tu mensaje no se envió a ningún servicio. Podés instalar el proyecto, explorar su código y ampliarlo con tu propio proveedor de IA.</p></div> : <p className="mt-5 text-xs text-muted">Demo · Sin proveedor conectado</p>}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="rounded-2xl border border-border/70 bg-surface-2/40 p-3 focus-within:border-accent/60">
        <label htmlFor="synapse-draft" className="sr-only">Mensaje para Synapse</label>
        <textarea id="synapse-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Preguntá sobre parciales, horarios, correlativas…" rows={2} className="w-full resize-none bg-transparent px-1 py-2 text-sm outline-none" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }}/>
        <div className="flex items-center justify-between gap-3"><span className="text-[11px] text-muted">Enter para enviar · Shift + Enter para una nueva línea</span><button type="submit" disabled={!draft.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-contrast disabled:opacity-40" aria-label="Enviar mensaje"><ArrowUp className="h-4 w-4"/></button></div>
      </form>
      <a className="inline-flex items-center gap-2 self-start text-xs font-semibold text-accent hover:underline" href="https://github.com/Juanpablo24-06/fiuba-informatica-planner" target="_blank" rel="noreferrer">Código e instrucciones de instalación <ExternalLink className="h-3.5 w-3.5"/></a>
    </DialogContent>
  </Dialog>;
}
