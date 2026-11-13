import fs from 'node:fs';
import path from 'node:path';
const html=fs.readFileSync('dist/index.html','utf8');
for(const route of ['login','mapa','cursos','planificar','calendario','horario','admin','agenda','agenda/semana','agenda/evaluaciones']){fs.mkdirSync(path.join('dist',route),{recursive:true});fs.writeFileSync(path.join('dist',route,'index.html'),html);}
fs.writeFileSync('dist/_headers',"/*\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; worker-src 'none'\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n");
console.log('Static routes and security headers generated. No server or private connectivity.');
