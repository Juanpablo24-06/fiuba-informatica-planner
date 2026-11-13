import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navigate } from './navigation';
export type LinkProps={href:string;prefetch?:boolean;replace?:boolean;scroll?:boolean};
export default function Link({href,prefetch:_prefetch,replace,scroll:_scroll,onClick,children,...props}:Omit<AnchorHTMLAttributes<HTMLAnchorElement>,'href'>&LinkProps){return <a {...props} href={href} onClick={(e:MouseEvent<HTMLAnchorElement>)=>{onClick?.(e);if(!e.defaultPrevented&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.button===0&&new URL(href,location.origin).origin===location.origin){e.preventDefault();navigate(href,replace);}}}>{children}</a>;}
