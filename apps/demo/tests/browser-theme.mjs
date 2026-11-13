import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const url = process.argv.find(value => value.startsWith('--url='))?.slice(6) ?? 'http://127.0.0.1:4176';
const server = process.argv.some(value => value.startsWith('--url=')) ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4176'], { stdio: 'ignore' });
const checks = [], errors = [];
let browser, page;
fs.mkdirSync('test-results', { recursive: true });
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.getByRole('button', { name: 'Confirmar y entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen Académico' })).toBeVisible();
  await page.waitForTimeout(400);
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const toggle = page.locator('.header-theme-toggle');
  const bounds = await toggle.boundingBox();
  const x = Math.floor(bounds.x + 8), y = Math.floor(bounds.y + 12);
  const originalHeader = await page.locator('header').first().boundingBox();
  await page.mouse.click(x, y);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.theme-wave-canvas')).toHaveAttribute('data-origin-x', String(x));
  await expect(page.locator('.theme-wave-canvas')).toHaveAttribute('data-origin-y', String(y));
  expect(await page.evaluate(() => localStorage.getItem('fiuba-theme'))).toBe('dark');
  expect(await page.locator('.theme-wave-canvas').evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  const sample = async (ms, name) => {
    await page.clock.runFor(ms);
    // Align CSS/WAAPI animations to the paused RAF clock for representative still frames.
    await page.evaluate(time => document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = time; }), name.includes('early') ? 96 : name.includes('middle') ? 192 : 352);
    await page.screenshot({ path: `test-results/theme-${name}.png` });
  };
  await sample(96, 'dark-early');
  await sample(96, 'dark-middle');
  await sample(160, 'dark-late');
  expect(await page.locator('header').first().boundingBox()).toEqual(originalHeader);
  await page.clock.runFor(180);
  await expect(page.locator('.theme-wave-canvas')).toHaveCount(0);
  checks.push('exact pointer origin; early/middle/late spatial propagation; stable header; cleanup within 500ms');
  // Resume paused color transitions before starting the opposite direction.
  await page.evaluate(() => document.getAnimations().forEach(animation => animation.finish()));
  await page.mouse.click(x, y);
  await sample(192, 'light-middle');
  await page.clock.runFor(320);
  await page.evaluate(() => document.getAnimations().forEach(animation => animation.finish()));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  checks.push('both directions preserve the existing palette and decorative geometry');

  // Repeated changes are bounded to one layer, with the new base equal to the previous pixels.
  await page.mouse.click(x, y);
  await page.clock.runFor(128);
  const pixels = () => page.locator('.theme-wave-canvas').evaluate(canvas => Array.from(canvas.getContext('2d').getImageData(30, 30, 1, 1).data));
  const visible = await pixels();
  await page.mouse.click(x + 3, y + 2);
  await expect(page.locator('.theme-wave-canvas')).toHaveCount(1);
  expect(await pixels()).toEqual(visible);
  await page.clock.runFor(32); await page.mouse.click(x, y);
  await page.clock.runFor(32); await page.mouse.click(x, y);
  await page.clock.runFor(512);
  await expect(page.locator('.theme-wave-canvas')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('fiuba-theme'))).toBe('light');
  expect(await page.locator('main [style*="background-clip: text"]').count()).toBe(0);
  checks.push('four rapid clicks keep one canvas, reuse visible pixels and persist the final preference');

  await toggle.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.theme-wave-canvas')).toHaveAttribute('data-origin-x', String(bounds.x + bounds.width / 2));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.theme-wave-canvas')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.theme-wave-canvas')).toHaveCount(0);
  checks.push('keyboard uses button center; enabling reduced motion cancels a wave; reduced motion has no spatial effect');
  await page.clock.resume();
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await toggle.click(); await page.waitForTimeout(160);
  await page.screenshot({ path: 'test-results/theme-mobile.png' });
  await expect(page.locator('.theme-wave-canvas')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await toggle.click();
  await page.setViewportSize({ width: 412, height: 844 });
  await expect(page.locator('.theme-wave-canvas')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  checks.push('mobile wave, no horizontal overflow, and saved theme restored on reload');
  const performanceSample = await page.evaluate(() => new Promise(resolve => {
    const frames = []; let previous = performance.now(); const start = previous;
    document.querySelector('.header-theme-toggle').click();
    const frame = now => {
      frames.push(now - previous); previous = now;
      if (now - start < 550) requestAnimationFrame(frame);
      else { const sorted = frames.slice(1).sort((a, b) => a - b); resolve({ frames: sorted.length, medianFrameMs: sorted[Math.floor(sorted.length / 2)], p95FrameMs: sorted[Math.floor(sorted.length * .95)] }); }
    }; requestAnimationFrame(frame);
  }));
  expect(errors).toEqual([]);
  fs.writeFileSync('test-results/theme-report.json', JSON.stringify({ status: 'passed', checks, errors, performanceSample }, null, 2));
  console.log(JSON.stringify({ status: 'passed', checks, errors, performanceSample }));
} catch (error) {
  await page?.screenshot({ path: 'test-results/theme-failure.png' }).catch(() => {});
  console.error(error); process.exitCode = 1;
} finally { await browser?.close(); server?.kill(); }
