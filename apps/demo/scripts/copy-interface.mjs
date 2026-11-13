import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('../..');
const target = process.cwd();
const aliases = new Set(['lib/queries','lib/auth','lib/google-calendar','lib/ai/queries','components/dashboard/calendar-sync','components/layout/synapse-launcher']);
const seen = new Set();
const copy = (name) => {
  name = name.replaceAll('\\','/');
  if (aliases.has(name.replace(/\.(tsx?|json)$/, '')) || seen.has(name)) return;
  if (/supabase|server-only|\/server\.|lib\/ai\/|lib\/chat\//.test(name)) throw new Error(`Production dependency rejected: ${name}`);
  seen.add(name);
  const source = path.join(root,name);
  const dest = path.join(target,name);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  const text = fs.readFileSync(source,'utf8');
  fs.writeFileSync(dest,text);
  for (const match of text.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)) {
    const spec = match[1];
    if (!spec.startsWith('@/') && !spec.startsWith('.')) continue;
    const base = spec.startsWith('@/') ? spec.slice(2) : path.posix.normalize(path.posix.join(path.posix.dirname(name),spec));
    if (aliases.has(base)) continue;
    const found = [base,base+'.ts',base+'.tsx',base+'.json',base+'/index.ts',base+'/index.tsx'].find(x => fs.existsSync(path.join(root,x)) && fs.statSync(path.join(root,x)).isFile());
    if (!found) throw new Error(`Missing ${base}`);
    copy(found);
  }
};
for (const page of ['page','mapa/page','cursos/page','planificar/page','calendario/page','admin/page','agenda/semana/page','agenda/evaluaciones/page']) copy(`app/(app)/${page}.tsx`);
for (const name of ['app-background','app-shell','top-nav','scrollbar-compensation-sync','shortcut-handler']) copy(`components/layout/${name}.tsx`);
copy('app/globals.css');
copy('tailwind.config.ts');
copy('data/subjects.json');
fs.mkdirSync('public',{recursive:true});
fs.copyFileSync(path.join(root,'public/avatar-generico.svg'),'public/avatar-generico.svg');
fs.copyFileSync(path.join(root,'app/icon.svg'),'public/icon.svg');
console.log(`Copied ${seen.size} UI and pure-domain files; no environment, production API, adapter or runtime data.`);
