import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const url = process.env.DEMO_TEST_URL ?? 'http://127.0.0.1:4175';
const server = process.env.DEMO_TEST_URL ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175'], { stdio: 'ignore' });
const checks = [], errors = [], requests = [];
let browser, page;
fs.mkdirSync('test-results', { recursive: true });
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
  page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => requests.push(r.url()));
  const screenshot = name => page.screenshot({ path: `test-results/ux-${name}.png`, animations: 'disabled', fullPage: true });
  const nav = async name => {
    await page.locator('header').getByRole('link', { name, exact: true }).first().click();
    await expect(page.locator('main[data-pending-navigation]')).toHaveAttribute('data-pending-navigation', 'false');
  };
  const profile = () => page.getByRole('button', { name: 'Perfil', exact: true }).click();
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('fiuba-public-demo-v1')));
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Elegí cómo entrar' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await screenshot('entry-desktop');
  await page.getByRole('radio', { name: /Administrador/ }).check();
  await page.getByRole('button', { name: 'Confirmar y entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen Académico' })).toBeVisible();
  checks.push('first visit uses light even with a dark OS; password-free profile entry');

  await nav('Cursos');
  await page.getByRole('textbox', { name: 'Buscar cursos' }).fill('algoritmos');
  const search = page.getByRole('textbox', { name: 'Buscar cursos' });
  await search.evaluate(el => { window.__searchNode = el; });
  await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click();
  await profile();
  await page.getByRole('button', { name: 'Índigo', exact: true }).click();
  await expect(page.locator('#header-profile-panel')).toBeVisible();
  expect(await search.evaluate(el => el === window.__searchNode)).toBe(true);
  await expect(search).toHaveValue('algoritmos');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Perfil', exact: true })).toBeFocused();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'indigo');
  await expect(search).toHaveValue('algoritmos');
  await page.getByRole('button', { name: 'Cambiar a modo claro' }).click();
  await profile(); await page.getByRole('button', { name: 'Coral', exact: true }).click(); await page.keyboard.press('Escape');
  checks.push('theme and palette persist without replacing inputs, closing Profile or losing course filters');

  await page.getByRole('button', { name: 'Consultá a Synapse' }).click();
  await page.getByRole('textbox', { name: 'Mensaje para Synapse' }).fill('¿Cómo puedo organizar mis horarios?');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByRole('status')).toContainText('La IA todavía no está conectada');
  await expect(page.getByRole('link', { name: 'Código e instrucciones de instalación' })).toHaveAttribute('href', 'https://github.com/Juanpablo24-06/fiuba-informatica-planner');
  await screenshot('synapse'); await page.keyboard.press('Escape');
  checks.push('Synapse accepts input, clearly reports no provider, and links to the actual repository');

  await nav('Cursos');
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();
  await page.getByRole('button', { name: 'CBC', exact: false }).filter({ hasText: 'CBC' }).first().click();
  await expect(page.locator('[data-ai-resource="course"]')).toHaveCount(6);
  await page.getByRole('button', { name: /^Todos/ }).click();
  await page.getByRole('button', { name: 'Nueva materia', exact: true }).click();
  await page.getByPlaceholder('Nombre de la materia', { exact: true }).fill('Materia QA UX');
  await page.getByRole('button', { name: 'Crear materia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Materia QA UX', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByPlaceholder('Nombre de la materia', { exact: true }).fill('Materia QA editada');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Materia QA editada', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Enviar materia a la papelera' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar a Papelera' }).click();
  await page.getByRole('button', { name: /Papelera/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restaurar' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: 'Buscar cursos' }).fill('Materia QA editada');
  await expect(page.locator('[data-ai-resource="course"]')).toHaveCount(1);
  checks.push('course filters, create, edit, archive and restore remain synchronized and persistent');

  await nav('Calendario');
  await expect(page.locator('[data-calendar-month]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Elegí dónde vas a trabajar' })).toHaveCount(0);
  await screenshot('calendar-desktop');
  // A 31st must advance exactly one month, including February.
  const term = await page.evaluate(() => localStorage.getItem('academic:selected-term'));
  await page.evaluate(termId => sessionStorage.setItem(`calendar:view:${termId}`, JSON.stringify({ date: '2026-01-31T12:00:00', view: 'month' })), term);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/enero de 2026/i);
  await page.getByRole('button', { name: 'Mes siguiente', exact: true }).last().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/febrero de 2026/i);
  await page.getByRole('button', { name: 'Mes anterior', exact: true }).last().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/enero de 2026/i);
  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await page.getByRole('button', { name: 'Semana', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Horario semanal' })).toBeVisible();
  await nav('Cursos'); await nav('Calendario');
  await expect(page.getByRole('region', { name: 'Horario semanal' })).toBeVisible();
  checks.push('calendar opens cleanly; month boundaries and calendar view recovery work');

  await nav('Planificar');
  await expect(page.getByRole('button', { name: 'Confirmar plan', exact: true })).toBeEnabled();
  const rail = page.locator('[data-planner-rail]');
  await rail.locator('summary').first().click();
  await rail.getByRole('button', { name: /Comisión 1B/ }).click();
  await expect.poll(async () => (await state()).scenarios[0].selections[0].slots[0].start_time).toBe('09:00');
  const selectedId = (await state()).scenarios[0].selections[0].id;
  const slotCount = (await state()).scenarios[0].selections[0].slots.length;
  await rail.getByRole('button', { name: /Comisión 1B/ }).click();
  expect((await state()).scenarios[0].selections[0].slots.length).toBe(slotCount);
  await page.evaluate(() => {
    const previous = window.fetch;
    let failed = false;
    window.fetch = async (input, options) => {
      if (!failed && String(input).includes('/selections/') && options?.method === 'PATCH') {
        failed = true;
        return new Response(JSON.stringify({ error: 'No se pudo guardar la comisión de prueba' }), { status: 503, headers: { 'content-type': 'application/json' } });
      }
      return previous(input, options);
    };
  });
  await rail.getByRole('button', { name: /Comisión 1A/ }).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo guardar');
  expect((await state()).scenarios[0].selections[0].slots[0].start_time).toBe('09:00');
  await page.reload();
  await expect(rail.locator('summary').first()).toContainText('Comisión 1B');
  await page.getByRole('button', { name: 'Confirmar plan', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar plan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const confirmed = (await state()).scenarios[0].selections.find(x => x.id === selectedId);
  expect((await state()).enrollments.find(x => x.id === confirmed.confirmedEnrollmentId).schedule[0].start_time).toBe('09:00');
  await nav('Calendario');
  await expect(page.getByRole('region', { name: 'Horario semanal' })).toContainText('09:00–12:00');
  checks.push('commission alternatives replace slots, do not duplicate, persist and update Calendar on confirmation');

  await nav('Planificar');
  await page.getByLabel('Acciones de Mi plan de ejemplo').click();
  await page.getByRole('button', { name: 'Duplicar', exact: true }).click();
  await expect(page.getByRole('tab', { name: /Mi plan de ejemplo copia/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar plan', exact: true })).toBeEnabled();
  const duplicated = (await state()).scenarios.at(-1);
  await rail.getByRole('button', { name: /^Quitar / }).first().click();
  await expect.poll(async () => (await state()).scenarios.find(x => x.id === duplicated.id).selections.length).toBe(duplicated.selections.length - 1);
  await page.reload();
  await expect(page.getByRole('tab', { name: /Mi plan de ejemplo copia/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByLabel('Acciones de Mi plan de ejemplo copia').click();
  await page.getByRole('button', { name: 'Vaciar', exact: true }).last().click();
  await expect(rail).toContainText('Todavía no agregaste materias');
  await page.reload(); await expect(rail).toContainText('Todavía no agregaste materias');
  await page.getByRole('button', { name: 'Añadir materia', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Añadir materia al escenario' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  checks.push('duplicate selections have authoritative IDs; remove, clear, active plan recovery and drawer keyboard flow work');

  // Open a personal activity with the keyboard, then edit after its persisted ID returns.
  const slot = page.locator('[data-grid-slot="lun-9"]');
  await slot.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').locator('input[type=text],input:not([type])').first().fill('Biblioteca de ejemplo');
  await page.getByRole('button', { name: 'Guardar actividad', exact: true }).click();
  await expect(page.getByRole('button', { name: /Biblioteca de ejemplo/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Biblioteca de ejemplo/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  checks.push('personal activities can be created with keyboard, saved and reopened');
  await screenshot('planner-desktop');

  await profile(); await page.getByRole('button', { name: 'Visualizador', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Añadir materia' })).toBeDisabled();
  await expect(page.locator('header').getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await profile(); await page.getByRole('button', { name: 'Administrador', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Añadir materia' })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Biblioteca de ejemplo/ })).toBeVisible();
  checks.push('profile switching updates permissions atomically and preserves the shared fictional trajectory');

  await page.setViewportSize({ width: 390, height: 844 });
  await nav('Calendario');
  await page.getByRole('button', { name: /^Do\s/ }).click();
  await expect(page.getByRole('region', { name: 'Horario semanal' })).toContainText('Dom');
  await screenshot('calendar-mobile');
  for (const section of ['Cursos', 'Planificar', 'Mapa']) {
    await nav(section);
    if (section === 'Mapa') await expect(page.locator('[data-map-view-shell]')).toHaveAttribute('aria-hidden', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await screenshot(section.toLowerCase() + '-mobile');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await profile(); await page.getByRole('button', { name: 'Esmeralda', exact: true }).click();
  expect(await page.locator('header').first().evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running' && Number(a.effect?.getTiming().duration) > 1).length)).toBe(0);
  await page.keyboard.press('Escape');
  checks.push('mobile courses/planner/map do not overflow; Sunday works; reduced-motion avoids running header effects');
  await page.goto(url + '/agenda/semana');
  await expect(page).toHaveURL(/\/calendario/);
  checks.push('legacy schedule URL redirects to the unified calendar');

  expect(errors).toEqual([]);
  expect(requests.filter(value => new URL(value).origin !== new URL(url).origin)).toEqual([]);
  expect(requests.filter(value => new URL(value).pathname.startsWith('/api/'))).toEqual([]);
  fs.writeFileSync('test-results/ux-report.json', JSON.stringify({ status: 'passed', checks, errors, requests: requests.length }, null, 2));
  console.log(JSON.stringify({ status: 'passed', checks, errors }));
} catch (error) {
  await page?.screenshot({ path: 'test-results/ux-failure.png' }).catch(() => {});
  fs.writeFileSync('test-results/ux-report.json', JSON.stringify({ status: 'failed', checks, errors, failure: error.message }, null, 2));
  console.error(error); process.exitCode = 1;
} finally { await browser?.close(); server?.kill(); }
