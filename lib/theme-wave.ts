/** A short-lived painting of the decorative background, never of application content. */
export type ThemeOrigin = { x: number; y: number };
type Orb = { x: number; y: number; rx: number; ry: number; color: string };
type Scene = { color: string; orbs: Orb[] };

export const THEME_WAVE_DURATION = 480;
let active: { canvas: HTMLCanvasElement; finish: () => void } | undefined;
let waveStamp: HTMLCanvasElement | undefined;
const STAMP_SIZE = 768;
const STAMP_RADIUS = 320;

export function finishThemeWave() {
  active?.finish();
}

/** Low-frequency asymmetry keeps the advancing edge soft without a noisy ripple. */
export function waveRadius(angle: number, radius: number) {
  return radius * (1 + 0.1 * Math.sin(3 * angle + 0.4) + 0.045 * Math.cos(5 * angle - 0.7));
}

function captureScene(background: HTMLElement): Scene {
  const color = getComputedStyle(document.documentElement).getPropertyValue("--color-canvas");
  const orbs = Array.from(background.querySelectorAll<HTMLElement>(".ambient-orb"))
    .sort((a, b) => (Number.parseInt(getComputedStyle(a).zIndex) || 0) - (Number.parseInt(getComputedStyle(b).zIndex) || 0))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, rx: rect.width / 2, ry: rect.height / 2, color: getComputedStyle(element).backgroundColor };
    });
  return { color: `rgb(${color})`, orbs };
}

function createLayer(width: number, height: number, scale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.scale(scale, scale);
  return { canvas, context };
}

function paintScene(context: CanvasRenderingContext2D, scene: Scene, width: number, height: number) {
  context.globalCompositeOperation = "source-over";
  context.fillStyle = scene.color;
  context.fillRect(0, 0, width, height);
  for (const orb of scene.orbs) {
    context.beginPath();
    context.ellipse(orb.x, orb.y, orb.rx, orb.ry, 0, 0, Math.PI * 2);
    context.fillStyle = orb.color;
    context.fill();
  }
}

function getWaveStamp() {
  if (waveStamp) return waveStamp;
  const layer = createLayer(STAMP_SIZE, STAMP_SIZE, 1);
  if (!layer) return null;
  const { context, canvas } = layer;
  // Rasterize the organic feather once, then scale this small texture per frame.
  // Backgrounds have no text, so a bounded resolution keeps the wave inexpensive.
  let previousOpacity = 0;
  for (let band = 1; band <= 24; band++) {
    const opacity = (1 - Math.cos(Math.PI * band / 24)) / 2;
    context.fillStyle = `rgba(0,0,0,${(opacity - previousOpacity) / (1 - previousOpacity)})`;
    previousOpacity = opacity;
    context.beginPath();
    for (let point = 0; point <= 96; point++) {
      const angle = point / 96 * Math.PI * 2;
      const edge = waveRadius(angle, STAMP_RADIUS) + (12 - band) / 3;
      const x = STAMP_SIZE / 2 + Math.cos(angle) * edge;
      const y = STAMP_SIZE / 2 + Math.sin(angle) * edge;
      if (point === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
  }
  waveStamp = canvas;
  return canvas;
}

export function transitionTheme(origin: ThemeOrigin, commit: () => void) {
  const root = document.documentElement;
  const background = document.querySelector<HTMLElement>("[data-theme-background]");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!background || motion.matches) {
    finishThemeWave();
    commit();
    return;
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  // Decorative artwork does not need full device resolution. Bound memory on large screens.
  const scale = Math.min(window.devicePixelRatio || 1, 1, Math.sqrt(1_000_000 / (width * height)));
  const base = createLayer(width, height, scale);
  const next = createLayer(width, height, scale);
  const stamp = getWaveStamp();
  const output = createLayer(width, height, scale);
  if (!base || !next || !stamp || !output) {
    finishThemeWave();
    commit();
    return;
  }

  if (active) {
    // Resume from the pixels actually on screen, not the previous target theme.
    base.context.drawImage(active.canvas, 0, 0, width, height);
  } else {
    paintScene(base.context, captureScene(background), width, height);
  }
  const cards = Array.from(document.querySelectorAll<HTMLElement>("main .panel"))
    .filter(element => {
      const rect = element.getBoundingClientRect();
      return !element.parentElement?.closest(".panel") && rect.top < height && rect.bottom > 0;
    })
    .slice(0, 16)
    .map(element => ({ element, translate: getComputedStyle(element).translate }));
  finishThemeWave();
  root.dataset.themeWave = "active";
  commit(); // Persistence and semantic state never depend on an animation completing.
  const target = captureScene(background);
  paintScene(next.context, target, width, height);
  const { canvas, context } = output;
  canvas.className = "theme-wave-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.originX = String(origin.x);
  canvas.dataset.originY = String(origin.y);
  context.drawImage(base.canvas, 0, 0, width, height);
  background.appendChild(canvas);

  const distance = Math.max(...[[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) => Math.hypot(x - origin.x, y - origin.y)));
  const maxRadius = (distance + 24) / 0.85;
  const animations = cards.map(({ element, translate }) => element.animate(
    [{ translate }, { translate: "0 -1.5px", offset: 0.4 }, { translate: "0 0" }],
    { duration: 400, delay: 40, easing: "cubic-bezier(.25,.7,.3,1)" }
  ));
  let frame = 0;
  let disposed = false;
  const start = performance.now();
  const finish = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    animations.forEach(animation => animation.cancel());
    canvas.remove();
    delete root.dataset.themeWave;
    window.removeEventListener("resize", finish);
    window.removeEventListener("scroll", finish);
    document.removeEventListener("visibilitychange", onVisibility);
    motion.removeEventListener("change", finish);
    active = undefined;
  };
  const onVisibility = () => { if (document.hidden) finish(); };
  active = { canvas, finish };
  window.addEventListener("resize", finish, { passive: true });
  window.addEventListener("scroll", finish, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  motion.addEventListener("change", finish);
  const draw = (now: number) => {
    if (!background.isConnected) { finish(); return; }
    const progress = Math.min(1, (now - start) / THEME_WAVE_DURATION);
    const radius = maxRadius * (1 - Math.pow(1 - progress, 1.45));
    const size = STAMP_SIZE * Math.max(radius, 0.01) / STAMP_RADIUS;
    context.globalCompositeOperation = "copy";
    context.drawImage(next.canvas, 0, 0, width, height);
    context.globalCompositeOperation = "destination-in";
    context.drawImage(stamp, origin.x - size / 2, origin.y - size / 2, size, size);
    context.globalCompositeOperation = "destination-over";
    context.drawImage(base.canvas, 0, 0, width, height);
    context.globalCompositeOperation = "source-over";
    if (progress === 1) finish(); else frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
}
