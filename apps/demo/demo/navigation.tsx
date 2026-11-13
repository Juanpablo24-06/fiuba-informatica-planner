import { useSyncExternalStore } from 'react';
let revision=0;
const signal=()=>{revision++;window.dispatchEvent(new Event('demo:navigate'));};
const subscribe=(listener:()=>void)=>{window.addEventListener('popstate',listener);window.addEventListener('demo:navigate',listener);return()=>{window.removeEventListener('popstate',listener);window.removeEventListener('demo:navigate',listener);};};
export const navigate=(href:string,replace=false)=>{const url=new URL(href,location.origin);if(url.origin!==location.origin)return;if(replace)history.replaceState(null,'',url);else history.pushState(null,'',url);signal();window.scrollTo(0,0);};
const router={push:(href:string)=>navigate(href),replace:(href:string)=>navigate(href,true),refresh:signal,prefetch:()=>{},back:()=>history.back(),forward:()=>history.forward()};
export function useRouter(){return router;}
export const normalizePathname=(pathname:string)=>pathname.replace(/\/+$/,'')||'/';
export function usePathname(){useSyncExternalStore(subscribe,()=>location.href+revision);return normalizePathname(location.pathname);}
export function useSearchParams(){usePathname();return new URLSearchParams(location.search);}
export function useRevision(){return useSyncExternalStore(subscribe,()=>location.href+revision);}
export function redirect(href:string):never{navigate(href,true);throw new Error('Redirect');}
