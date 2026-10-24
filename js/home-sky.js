// Ciel vivant de l'accueil : il suit l'heure réelle (nuit, aube, matin, après-midi,
// heure dorée, crépuscule). Un arc du jour porte le soleil (7h → 19h) ou la lune.
// Couleurs interpolées à la minute ; le mouvement passe par transform / opacity.

import { cssStars } from './sky.js';

// Ciel par heure : [haut, milieu, bas], étoiles, couleur de l'astre, lueur d'horizon.
const KEYS = [
  { h: 0, sky: ['#02040c', '#060b1e', '#0b1230'], stars: 1, glow: '#2a1a4a', glowA: 0.25 },
  { h: 4.5, sky: ['#02040c', '#070c22', '#111838'], stars: 1, glow: '#2a1a4a', glowA: 0.3 },
  { h: 6, sky: ['#0a1236', '#2a2b63', '#7a4a78'], stars: 0.6, glow: '#ff8a6a', glowA: 0.45 },
  { h: 7.25, sky: ['#1b2f6b', '#6a5a9a', '#f09a7a'], stars: 0.15, glow: '#ffb27a', glowA: 0.7 },
  { h: 9, sky: ['#2a58ad', '#6a9bd8', '#f2c7a2'], stars: 0, glow: '#ffd2a0', glowA: 0.45 },
  { h: 12, sky: ['#1c5cc4', '#4d92e4', '#a6d0fb'], stars: 0, glow: '#ffffff', glowA: 0.25 },
  { h: 16, sky: ['#2160c0', '#5a98de', '#bcd9f3'], stars: 0, glow: '#fff1d6', glowA: 0.3 },
  { h: 17.75, sky: ['#2b4c9a', '#b56f8e', '#f7a35c'], stars: 0, glow: '#ff9a4a', glowA: 0.75 },
  { h: 19.25, sky: ['#1a2456', '#5e3a74', '#d9674c'], stars: 0.25, glow: '#ff6a4a', glowA: 0.6 },
  { h: 20.75, sky: ['#0a1133', '#20245a', '#43305c'], stars: 0.75, glow: '#5a3a7a', glowA: 0.35 },
  { h: 22.5, sky: ['#02040c', '#060b1e', '#0b1230'], stars: 1, glow: '#2a1a4a', glowA: 0.25 },
  { h: 24, sky: ['#02040c', '#060b1e', '#0b1230'], stars: 1, glow: '#2a1a4a', glowA: 0.25 },
];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerp = (a, b, t) => a + (b - a) * t;
const mixHex = (a, b, t) => `rgb(${hex(a).map((v, i) => Math.round(lerp(v, hex(b)[i], t))).join(',')})`;

export function phaseLabel(h) {
  if (h < 5) return 'Nuit';
  if (h < 7.5) return 'Aube';
  if (h < 12) return 'Matin';
  if (h < 17) return 'Après-midi';
  if (h < 19.5) return 'Heure dorée';
  if (h < 21) return 'Crépuscule';
  return 'Nuit';
}

export function greeting(h) {
  if (h >= 5 && h < 12) return 'Bonjour Théo';
  if (h >= 12 && h < 18) return 'Bon après-midi Théo';
  return 'Bonsoir Théo';
}

function skyAt(h) {
  let i = 0;
  while (i < KEYS.length - 2 && h >= KEYS[i + 1].h) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = (h - a.h) / (b.h - a.h);
  return {
    sky: a.sky.map((c, k) => mixHex(c, b.sky[k], t)),
    stars: lerp(a.stars, b.stars, t),
    glow: mixHex(a.glow, b.glow, t),
    glowA: lerp(a.glowA, b.glowA, t),
  };
}

// Astre : soleil de 7h à 19h, lune le reste du temps ; t = position sur l'arc (0 → 1).
function bodyAt(h) {
  if (h >= 7 && h < 19) return { kind: 'sun', t: (h - 7) / 12 };
  return { kind: 'moon', t: ((h - 19 + 24) % 24) / 12 };
}

export function createHomeSky(el) {
  el.innerHTML = `
    <div class="hs-base"></div>
    <div class="hs-stars"><span class="s1"></span><span class="s2 twinkle-a"></span></div>
    <div class="hs-haze"><i></i><i></i></div>
    <div class="hs-glow"></div>
    <svg class="hs-arc" aria-hidden="true"><path class="hs-arc-path"/><path class="hs-arc-done"/></svg>
    <div class="hs-body"><span class="hs-halo"></span><span class="hs-disc"></span></div>
  `;
  const $ = (s) => el.querySelector(s);
  const base = $('.hs-base'), stars = $('.hs-stars'), glow = $('.hs-glow');
  const arc = $('.hs-arc'), path = $('.hs-arc-path'), done = $('.hs-arc-done'), body = $('.hs-body');
  $('.s1').style.backgroundImage = cssStars(120, 21);
  $('.s2').style.backgroundImage = cssStars(36, 37);

  let current = { kind: 'sun', t: 0 };

  // Arc du jour : d'un bord à l'autre, sommet dans le tiers haut de l'écran.
  function layoutArc() {
    const W = innerWidth, H = innerHeight;
    arc.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const y0 = H * 0.44, top = H * 0.06;
    const d = `M ${-W * 0.04} ${y0} Q ${W / 2} ${top} ${W * 1.04} ${y0}`;
    path.setAttribute('d', d);
    done.setAttribute('d', d);
  }

  function placeBody(t) {
    const len = path.getTotalLength();
    const p = path.getPointAtLength(Math.max(0, Math.min(1, t)) * len);
    body.style.transform = `translate(${p.x}px, ${p.y}px)`;
    done.style.strokeDasharray = `${len}`;
    done.style.strokeDashoffset = `${len * (1 - t)}`;
  }

  function update(date) {
    const h = date.getHours() + date.getMinutes() / 60;
    const s = skyAt(h);
    base.style.background = `linear-gradient(180deg, ${s.sky[0]} 0%, ${s.sky[1]} 55%, ${s.sky[2]} 100%)`;
    stars.style.opacity = s.stars.toFixed(2);
    glow.style.background = `radial-gradient(120% 60% at 50% 100%, ${s.glow}, transparent 70%)`;
    glow.style.opacity = s.glowA.toFixed(2);
    current = bodyAt(h);
    el.dataset.body = current.kind;
    el.dataset.bright = h >= 8.5 && h < 17.5 ? '1' : '0';
    placeBody(current.t);
    return { top: s.sky[0], label: phaseLabel(h) };
  }

  // Entrée : l'arc se trace, puis l'astre glisse de l'horizon jusqu'à l'heure actuelle.
  function intro() {
    const len = path.getTotalLength();
    path.animate({ strokeDashoffset: [len, 0] }, { duration: 1400, delay: 150, easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'backwards' });
    path.style.strokeDasharray = `${len}`;
    const target = current.t, start = performance.now() + 450, dur = 1500;
    const ease = (x) => 1 - Math.pow(1 - x, 4);
    placeBody(0);
    body.animate({ opacity: [0, 1] }, { duration: 500, delay: 400, fill: 'backwards' });
    const step = (now) => {
      const k = Math.min(1, Math.max(0, (now - start) / dur));
      placeBody(target * ease(k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Parallaxe au toucher : les couches bougent un peu, à des profondeurs différentes.
  function parallax(x, y) {
    stars.style.transform = `translate(${x * -6}px, ${y * -6}px)`;
    $('.hs-haze').style.transform = `translate(${x * -14}px, ${y * -10}px)`;
  }

  layoutArc();
  addEventListener('resize', () => {
    layoutArc();
    placeBody(current.t);
    path.style.strokeDasharray = `${path.getTotalLength()}`;
  });

  return { update, intro, parallax };
}
