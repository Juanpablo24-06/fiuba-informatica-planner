import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import fs from 'node:fs';

const storage = new Map();
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.localStorage = { getItem: key => storage.get(key) ?? null };
const bundle = await build({ stdin: { contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import RolePicker from './demo/role-picker'; export const render = () => renderToStaticMarkup(React.createElement(RolePicker,{onConfirm(){}})); export {normalizePathname} from './demo/navigation';`, resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', alias: { '@': process.cwd() } });
const compiled = { exports: {} };
new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports);
const { render, normalizePathname } = compiled.exports;

test('entry exposes profiles, both themes and four palettes with saved preferences', () => {
  storage.clear();
  let html = render();
  const inputs = text => text.match(/<input\b[^>]*>/g);
  assert.equal(inputs(html).length,8);
  assert.ok(inputs(html).some(input => input.includes('name="appearance-theme"') && input.includes('value="light"') && input.includes('checked')));
  storage.set('fiuba-theme','dark'); storage.set('fiuba-palette','esmeralda');
  html = render();
  assert.ok(inputs(html).some(input => input.includes('value="dark"') && input.includes('checked')));
  assert.ok(inputs(html).some(input => input.includes('value="esmeralda"') && input.includes('checked')));
  assert.ok(html.indexOf('name="appearance-palette"') < html.indexOf('Confirmar y entrar'));
  assert.ok(!html.includes('Conectá materias'));
});
test('entry illustration preserves the existing map route and has no animation', () => {
  const illustration = fs.readFileSync('components/map/map-route-illustration.tsx','utf8');
  const original = fs.readFileSync('components/map/map-loading-stage.tsx','utf8');
  for (const path of illustration.matchAll(/d="(M [^"]+)"/g)) assert.ok(original.includes(path[1]));
  assert.ok(!illustration.includes('<animate'));
  assert.ok(!illustration.includes('loader-path-trace'));
});
test('static host trailing slashes preserve the selected route on reload', () => {
  for(const route of ['/admin','/cursos','/calendario','/planificar','/mapa','/login','/agenda/semana']){
    assert.equal(normalizePathname(route+'/'),route);
    assert.equal(normalizePathname(route),route);
  }
  assert.equal(normalizePathname('/'),'/');
});
