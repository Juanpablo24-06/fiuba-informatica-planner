import { defineConfig } from 'vite';
import path from 'node:path';
const file = (name: string) => path.resolve(name);
export default defineConfig({
  // This static demo must never compile local service credentials into assets.
  envDir:false,
  resolve:{alias:[
    {find:'@/lib/queries',replacement:file('demo/queries.ts')},
    {find:'@/lib/auth',replacement:file('demo/auth.ts')},
    {find:'@/lib/google-calendar',replacement:file('demo/calendar.ts')},
    {find:'@/lib/ai/queries',replacement:file('demo/ai.ts')},
    {find:'@/components/dashboard/calendar-sync',replacement:file('demo/integrations.tsx')},
    {find:'next/navigation',replacement:file('demo/navigation.tsx')},
    {find:'next/link',replacement:file('demo/link.tsx')},
    {find:'next/image',replacement:file('demo/image.tsx')},
    {find:'@',replacement:file('.')}
  ]},
  esbuild:{jsx:'automatic'},
  build:{sourcemap:false,chunkSizeWarningLimit:500}
});
