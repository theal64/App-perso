// Icône "soleil sur l'horizon" de la carte Routine du matin (design "Icône Routine matin").
// Au toucher : le soleil se lève, les rayons se tracent, l'étoile rouge s'allume,
// onde de choc et étincelles. Au retour sur l'accueil, il se recouche.
// Les couleurs viennent des variables --ico-off / --ico-on / --ico-hz de la carte.

const EASE = 'cubic-bezier(.2,.75,.2,1)';
const SPARK_ANGLES = [-150, -118, -90, -62, -30, -172, -8];

const sparks = SPARK_ANGLES.map((deg, i) => {
  const a = (deg * Math.PI) / 180;
  const x = Math.cos(a);
  const y = Math.sin(a) - 0.04;
  const color = i === 1 || i === 4 ? '#ff6f6a' : i % 2 ? '#eaf4ff' : '#8fcaff';
  const dist = 22 + ((i * 7) % 11);
  return `<line class="spk" stroke="${color}" x1="0" y1="0" x2="${(-x * 4).toFixed(2)}" y2="${(-y * 4).toFixed(2)}" data-x="${x.toFixed(3)}" data-y="${y.toFixed(3)}" data-d="${dist}"/>`;
}).join('');

export const SUN_ICON = `
  <span class="ibox" aria-hidden="true">
    <span class="halo"></span>
    <svg class="ico" viewBox="0 0 24 24">
      <defs><clipPath id="ico-ciel"><path d="M0 0H24V19.5H21.5C17.5 16.4 6.5 16.4 2.5 19.5H0Z"/></clipPath></defs>
      <g clip-path="url(#ico-ciel)"><g class="sung"><circle class="sun" cx="12" cy="11.5" r="3"/></g></g>
      <path class="ray" pathLength="1" data-o="0" d="M12 6.9V5.1"/>
      <path class="ray" pathLength="1" data-o="1" d="M15.25 8.25L16.5 7"/>
      <path class="ray" pathLength="1" data-o="1" d="M8.75 8.25L7.5 7"/>
      <path class="ray" pathLength="1" data-o="2" d="M16.6 11.5H18.4"/>
      <path class="ray" pathLength="1" data-o="2" d="M7.4 11.5H5.6"/>
      <path class="hz" d="M2.5 19.5C6.5 16.4 17.5 16.4 21.5 19.5"/>
      <circle class="red" cx="19.6" cy="4.4" r=".8"/>
    </svg>
    <span class="fx"><svg viewBox="-60 -60 120 120">
      <circle class="wave w1" cx="0" cy="-1" r="34" stroke="#ff6f6a" stroke-width="1.2"/>
      <circle class="wave w2" cx="0" cy="-1" r="32" stroke="#eaf4ff" stroke-width=".9"/>
      ${sparks}
    </svg></span>
  </span>`;

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function anim(el, keyframes, opts) {
  return el?.animate(keyframes, { fill: 'both', easing: EASE, ...opts });
}

// Lever du soleil (≈ 560 ms). Résout quand l'écran peut s'ouvrir.
export function riseIcon(tile) {
  const q = (sel) => tile.querySelector(sel);
  const all = (sel) => tile.querySelectorAll(sel);
  if (!q('.ico')) return Promise.resolve();
  // Annule les animations précédentes du script (pas les boucles CSS de la carte).
  const isCss = (a) => typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation;
  tile.getAnimations({ subtree: true }).filter((a) => !isCss(a)).forEach((a) => a.cancel());
  tile.classList.add('ico-on');
  if (reduceMotion()) return Promise.resolve();

  try {
    navigator.vibrate?.(8);
  } catch {
    // pas de vibration sur iPhone : sans importance
  }
  anim(tile, [{ transform: 'scale(.96)' }, { transform: 'scale(1.025)', offset: 0.45 }, { transform: 'scale(1)' }], { duration: 380 });
  anim(q('.sung'), [{ transform: 'translateY(5.5px)' }, { transform: 'translateY(-.7px)', offset: 0.65 }, { transform: 'translateY(0)' }], { duration: 460 });
  all('.ray').forEach((r) =>
    anim(r, [{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0, opacity: 1 }], { duration: 260, delay: 180 + Number(r.dataset.o) * 45 })
  );
  anim(q('.red'), [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1.6)', offset: 0.55 }, { opacity: 1, transform: 'scale(1)' }], { duration: 300, delay: 380 });
  anim(q('.halo'), [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 0.95, transform: 'scale(1)', offset: 0.3 }, { opacity: 0, transform: 'scale(1.25)' }], { duration: 700, delay: 60, easing: 'ease-out' });
  anim(q('.w1'), [{ opacity: 0.8, transform: 'scale(.12)' }, { opacity: 0, transform: 'scale(1)' }], { duration: 620, delay: 120, easing: 'cubic-bezier(.1,.6,.3,1)' });
  anim(q('.w2'), [{ opacity: 0.7, transform: 'scale(.12)' }, { opacity: 0, transform: 'scale(.92)' }], { duration: 580, delay: 150, easing: 'cubic-bezier(.1,.6,.3,1)' });
  all('.spk').forEach((s, i) => {
    const x = Number(s.dataset.x);
    const y = Number(s.dataset.y);
    const d = Number(s.dataset.d);
    anim(s, [
      { opacity: 0, transform: `translate(${x * 6}px,${y * 6}px)` },
      { opacity: 1, transform: `translate(${x * 12}px,${y * 12}px)`, offset: 0.25 },
      { opacity: 0, transform: `translate(${x * d}px,${y * d + 3}px)` },
    ], { duration: 520, delay: 140 + i * 12, easing: 'cubic-bezier(.15,.7,.3,1)' });
  });
  anim(q('.chev'), [{ transform: 'translateX(0)' }, { transform: 'translateX(4px)', offset: 0.5 }, { transform: 'translateX(0)' }], { duration: 360, delay: 200 });
  return new Promise((resolve) => setTimeout(resolve, 560));
}

// Le soleil se recouche (retour sur l'accueil).
export function setIcon(tile) {
  if (!tile.querySelector('.ico') || reduceMotion()) {
    tile.classList.remove('ico-on');
    return;
  }
  tile.classList.add('ico-setting');
  tile.classList.remove('ico-on');
  setTimeout(() => tile.classList.remove('ico-setting'), 500);
}
