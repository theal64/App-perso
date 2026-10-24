// Ciel de l'aube : la progression fait passer de la nuit profonde au plein jour.
// Couches empilées : 8 dégradés (fondus par opacité), étoiles en canvas
// dessinées une seule fois, lueur d'horizon et soleil. Les changements
// passent uniquement par opacity / transform, en transitions CSS lentes.

import { setThemeColor } from './theme.js';

// [haut, milieu, bas] pour chaque palier, de 0/7 à 7/7.
export const STAGES = [
  ['#02040b', '#060a1a', '#0c1430'], // nuit profonde
  ['#040919', '#0a1432', '#18244d'], // nuit
  ['#0a1636', '#1b2d60', '#38487f'], // heure bleue
  ['#18204c', '#3b3876', '#6b4f8c'], // violet
  ['#262c62', '#6a4c88', '#c87088'], // rose à l'horizon
  ['#43538c', '#b27596', '#f39a6c'], // rose et orange
  ['#9aaccc', '#e2b3a0', '#f6c28c'], // lever du soleil
  ['#f3ece2', '#f6efe4', '#efcfae'], // plein jour, tons sable
];

const STARS = [1, 0.92, 0.75, 0.5, 0.28, 0.1, 0, 0];
const GLOW = [0, 0.08, 0.2, 0.4, 0.65, 0.9, 0.8, 0.5];
const GLOW_SCALE = [0.5, 0.55, 0.65, 0.75, 0.9, 1, 1.1, 1.2];
const SUN = [260, 260, 260, 260, 250, 175, 90, 0]; // translateY, en % de sa taille
const RAYS = [0, 0, 0, 0, 0, 0.08, 0.35, 0.8];

const clamp = (v) => Math.min(1, Math.max(0, v));

function interp(values, f) {
  const i = Math.min(Math.floor(f), values.length - 2);
  return values[i] + (values[i + 1] - values[i]) * (f - i);
}

// Palier continu (0 → 7) à partir du nombre d'étapes faites.
export const stageOf = (done, total) => (done / total) * (STAGES.length - 1);

export function skyGradient(f) {
  const [top, mid, bottom] = STAGES[Math.round(f)];
  return `linear-gradient(180deg, ${top} 0%, ${mid} 58%, ${bottom} 100%)`;
}

export const starsAt = (f) => interp(STARS, f);
export const glowAt = (f) => interp(GLOW, f);

// Générateur pseudo-aléatoire déterministe : le ciel est le même à chaque ouverture.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Petites étoiles en CSS pur, pour l'aperçu sur la carte d'accueil.
export function cssStars(count, seed) {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => {
    const x = (rand() * 100).toFixed(1);
    const y = (rand() * 80).toFixed(1);
    const r = (0.6 + rand() * 0.9).toFixed(2);
    const a = (0.45 + rand() * 0.55).toFixed(2);
    return `radial-gradient(circle ${r}px at ${x}% ${y}%, rgba(255,255,255,${a}) 98%, transparent 100%)`;
  }).join(',');
}

const STAR_COLORS = ['255,255,255', '214,226,255', '255,238,218'];

function dot(ctx, x, y, r, a, color) {
  ctx.fillStyle = `rgba(${color},${a})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function paint(canvas, w, h, dpr, draw) {
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw(ctx);
}

function drawMilkyWay(ctx, w, h, rand) {
  // Bande diagonale, du bas gauche vers le haut droit.
  const x0 = -0.1 * w, y0 = 0.62 * h, x1 = 1.1 * w, y1 = 0.04 * h;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const spread = () => (rand() + rand() + rand() - 1.5) / 1.5;

  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const t = rand(), off = spread() * 0.08 * len;
    const x = x0 + dx * t + nx * off, y = y0 + dy * t + ny * off;
    const r = 40 + rand() * 90;
    const color = rand() < 0.5 ? '150,145,230' : '225,185,240';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${0.03 + rand() * 0.035})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  for (let i = 0; i < 520; i++) {
    const t = rand(), off = spread() * 0.07 * len;
    dot(ctx, x0 + dx * t + nx * off, y0 + dy * t + ny * off, 0.3 + rand() * 0.4, 0.12 + rand() * 0.3, STAR_COLORS[0]);
  }
}

function drawBright(ctx, w, h, rand, n) {
  for (let i = 0; i < n; i++) {
    const x = rand() * w, y = rand() * h, r = 0.8 + rand() * 0.8;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    halo.addColorStop(0, 'rgba(220,230,255,.22)');
    halo.addColorStop(1, 'rgba(220,230,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    dot(ctx, x, y, r, 0.95, STAR_COLORS[Math.floor(rand() * 3)]);
  }
}

function drawStarfield([base, twinkleA, twinkleB], w, h) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const k = (w * h) / (390 * 844);
  paint(base, w, h, dpr, (ctx) => {
    const rand = mulberry32(7);
    drawMilkyWay(ctx, w, h, rand);
    for (let i = 0; i < 260 * k; i++) {
      const r = 0.25 + rand() ** 3 * 1.1;
      dot(ctx, rand() * w, rand() * h, r, 0.25 + rand() * 0.6, STAR_COLORS[Math.floor(rand() * 3)]);
    }
  });
  paint(twinkleA, w, h, dpr, (ctx) => drawBright(ctx, w, h, mulberry32(11), 26 * k));
  paint(twinkleB, w, h, dpr, (ctx) => drawBright(ctx, w, h, mulberry32(23), 26 * k));
}

export function createSky(el) {
  el.innerHTML = `
    ${STAGES.map((_, i) => `<div class="sky-layer" style="background:${skyGradient(i)}"></div>`).join('')}
    <div class="sky-stars">
      <canvas></canvas><canvas class="twinkle-a"></canvas><canvas class="twinkle-b"></canvas>
      <div class="sky-meteors"></div>
    </div>
    <div class="sky-glow"></div>
    <div class="sky-rays"><i></i></div>
    <div class="sky-sun"></div>
  `;
  const layers = [...el.querySelectorAll('.sky-layer')];
  const stars = el.querySelector('.sky-stars');
  const canvases = [...stars.querySelectorAll('canvas')];
  const meteors = el.querySelector('.sky-meteors');
  const glow = el.querySelector('.sky-glow');
  const rays = el.querySelector('.sky-rays');
  let starsOpacity = 1;

  // Étoiles filantes de temps en temps, tant qu'il fait nuit.
  let meteorTimer;
  const spawnMeteor = () => {
    meteorTimer = setTimeout(spawnMeteor, 4000 + Math.random() * 7000);
    if (document.hidden || starsOpacity < 0.25 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const m = document.createElement('div');
    m.className = 'meteor';
    m.style.left = `${innerWidth * (0.3 + Math.random() * 0.8)}px`;
    m.style.top = `${innerHeight * Math.random() * 0.35}px`;
    meteors.append(m);
    const angle = -(20 + Math.random() * 25); // vers le bas à gauche
    const dist = 260 + Math.random() * 260;
    const at = (k) => `rotate(${angle}deg) translateX(${-dist * k}px)`;
    m.animate(
      [
        { transform: at(0), opacity: 0 },
        { transform: at(0.15), opacity: 1, offset: 0.15 },
        { transform: at(1), opacity: 0 },
      ],
      { duration: 900 + Math.random() * 600, easing: 'cubic-bezier(.3,.1,.6,1)' }
    ).finished.then(() => m.remove());
  };
  meteorTimer = setTimeout(spawnMeteor, 1800);

  let drawnSize = '';
  let resizeTimer;
  const draw = () => {
    const size = `${innerWidth}x${innerHeight}`;
    if (size === drawnSize) return;
    drawnSize = size;
    drawStarfield(canvases, innerWidth, innerHeight);
  };
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(draw, 200);
  };
  draw();
  addEventListener('resize', onResize);

  // instant : pas de transition (réouverture de la routine en cours).
  function set(done, total, { instant = false } = {}) {
    const f = stageOf(done, total);
    if (instant) el.classList.add('sky-instant');

    layers.forEach((layer, i) => (layer.style.opacity = i === 0 ? 1 : clamp(f - i + 1)));
    starsOpacity = starsAt(f);
    stars.style.opacity = starsOpacity;
    glow.style.opacity = glowAt(f);
    glow.style.transform = `scaleY(${interp(GLOW_SCALE, f)})`;
    rays.style.opacity = interp(RAYS, f);
    // Le soleil et ses rayons suivent la même variable : ils montent ensemble.
    el.style.setProperty('--sun-shift', interp(SUN, f) / 100);
    setThemeColor(STAGES[Math.round(f)][0]);

    if (instant) {
      el.offsetHeight; // applique l'état avant de réactiver les transitions
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('sky-instant')));
    }
  }

  return {
    set,
    destroy() {
      removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
      clearTimeout(meteorTimer);
    },
  };
}
