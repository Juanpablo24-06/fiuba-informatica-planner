import { createRoot } from 'react-dom/client';
import { useEffect, useState, type ReactNode } from 'react';
import RolePicker from './role-picker';
import SynapseLauncher from '../components/layout/synapse-launcher';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../components/ui/dialog';
import AppBackground from '../components/layout/app-background';
import AppShell from '../components/layout/app-shell';
import TopNav from '../components/layout/top-nav';
import ShortcutHandler from '../components/layout/shortcut-handler';
import ScrollbarCompensationSync from '../components/layout/scrollbar-compensation-sync';
import { applyAppearancePreferences, readAppearancePreferences } from '../lib/theme-preferences';
import { buildProgressSnapshot } from '../lib/progress';
import { getRole, setRole, getState, statusMap, resetState, DEMO_CHANGE } from './store';
import { navigate, usePathname, useRevision } from './navigation';
import { installDemoApi } from './api';
import { buildPendingNavigationState, createTransitionId, setMapTransitionState } from '../components/layout/map-transition-store';
import '../app/globals.css';
import './style.css';
import './fonts.css';

installDemoApi();
applyAppearancePreferences(readAppearancePreferences());

// Route modules (including the map and planner) load only when requested.
const pages = {
  '/': () => import('../app/(app)/page'),
  '/mapa': () => import('../app/(app)/mapa/page'),
  '/cursos': () => import('../app/(app)/cursos/page'),
  '/planificar': () => import('../app/(app)/planificar/page'),
  '/calendario': () => import('../app/(app)/calendario/page'),
  '/admin': () => import('../app/(app)/admin/page'),
  '/agenda/evaluaciones': () => import('../app/(app)/agenda/evaluaciones/page')
};

function App(){
  const path=usePathname();const navigation=useRevision();
  const [role,updateRole]=useState(getRole);const [revision,refresh]=useState(0);const [resetting,showReset]=useState(false);
  const [content,setContent]=useState<{key:string;node:ReactNode}|null>(null);const [failure,setFailure]=useState('');
  const pageKey = `${path}:${role}`;
  useEffect(()=>{const listener=()=>{updateRole(getRole());refresh(x=>x+1);};window.addEventListener(DEMO_CHANGE,listener);return()=>window.removeEventListener(DEMO_CHANGE,listener);},[]);
  useEffect(()=>{
    if(!role||path==='/login')return;let active=true;setFailure('');
    if(['/agenda','/agenda/semana','/horario'].includes(path)){navigate('/calendario'+location.search,true);return;}
    const loadPage=pages[path as keyof typeof pages] ?? pages['/'];
    if(path==='/admin'&&role!=='admin'){navigate('/',true);return;}
    loadPage().then(({default:page})=>page({searchParams:Promise.resolve(Object.fromEntries(new URLSearchParams(location.search)))})).then(node=>{if(active)setContent({key:pageKey,node});}).catch(()=>{if(active)setFailure('No se pudo abrir esta vista. Podés volver al resumen o restablecer la demo.');});
    return()=>{active=false;};
  },[path,navigation,role,revision,pageKey]);
  const enter=(next:'admin'|'viewer')=>{
    const destination=path==='/login'||path==='/admin'&&next==='viewer'?'/':path;
    if(!role||path==='/login'){
      const startedAt=Date.now();
      const pending=buildPendingNavigationState('/',destination,startedAt,createTransitionId());
      setMapTransitionState({...pending,transitioning:true,animateMapBar:false,mapEntryPhase:'loader',loaderStartedAt:startedAt,minimumLoaderMs:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:pending.minimumLoaderMs});
    }
    setRole(next);if(destination!==path)navigate(destination,true);
  };
  if(!role||path==='/login')return <div className="relative min-h-svh"><AppBackground/><RolePicker onConfirm={enter}/></div>;
  const progress=buildProgressSnapshot(getState().subjects.filter(x=>!x.deleted_at),statusMap());
  return <div className="relative min-h-svh overflow-x-clip"><AppBackground/><ScrollbarCompensationSync/><TopNav role={role} onRoleChange={enter} onReset={()=>showReset(true)}/><ShortcutHandler/><AppShell progress={progress}><div key={`${path}:${role}`} data-demo-page className={path === '/' ? "demo-page-enter" : undefined}>{failure?<div className="panel p-8" role="alert"><p>{failure}</p><button onClick={()=>navigate('/')} className="mt-4 text-accent">Volver al resumen</button></div>:content?.key===pageKey?content.node:null}</div></AppShell><SynapseLauncher key={role} role={role}/><Dialog open={resetting} onOpenChange={showReset}><DialogContent><DialogTitle>¿Restablecer la demo?</DialogTitle><DialogDescription className="mt-3">Se borran tus cambios de ejemplo en este navegador y vuelven los datos ficticios iniciales. Tus preferencias visuales se conservan.</DialogDescription><div className="mt-5 flex justify-end gap-3"><button autoFocus onClick={()=>showReset(false)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button><button onClick={()=>{resetState();setContent(null);showReset(false);}} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast">Restablecer</button></div></DialogContent></Dialog></div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
