// Point d'entrée : accueil (ciel vivant, horloge, boutons) et ouverture des sections.

import { sections } from './tabs/index.js';
import { getStreak } from './tabs/matin.js';
import { dateKey, formatLongDate } from './date.js';
import { openCard, closeCard } from './transition.js';
import { setThemeColor } from './theme.js';
import { CHEVRON } from './icons.js';
import { createHomeSky, greeting } from './home-sky.js';

const home = document.getElementById('home');
const screen = document.getElementById('screen');
const grid = document.getElementById('grid');
const $ = (id) => document.getElementById(id);

let current = null; // section ouverte
let cleanup = null;
let busy = false;
let renderedDay = dateKey();
let reloadAfterClose = false; // une nouvelle version attend la fermeture de l'écran
let introPlayed = false;

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE_OUT = 'cubic-bezier(.2,.75,.2,1)';
const SPRING = 'cubic-bezier(.34,1.56,.64,1)';

// Aperçu d'une autre heure pour tester les ambiances : ?heure=17:30
const forcedHour = new URLSearchParams(location.search).get('heure');
const startedAt = Date.now();
function now() {
  if (!forcedHour) return new Date();
  const [h, m = 0] = forcedHour.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return new Date(d.getTime() + (Date.now() - startedAt));
}

const sky = createHomeSky($('home-sky'));

// ---------- Boutons ----------

// Bouton par défaut : icône, titre, sous-titre, puis "Bientôt" ou chevron.
function defaultCard(el, section) {
  el.classList.toggle('is-soon', !!section.soon);
  el.innerHTML = `
    <span class="ibox" aria-hidden="true">${section.icon}</span>
    <span class="t-txt">
      <span class="t1">${section.title}</span>
      ${section.subtitle ? `<span class="t2">${section.subtitle}</span>` : ''}
    </span>
    ${section.soon ? '<span class="badge">Bientôt</span>' : CHEVRON}
  `;
}

// Le bouton pertinent selon l'heure (isFeatured) est mis en avant : « Maintenant ».
function makeTile(section, isNow) {
  const el = document.createElement('button');
  el.type = 'button';
  el.dataset.id = section.id;
  el.className = `tile tile-row${isNow ? ' is-now' : ''}`;
  if (section.renderCard) section.renderCard(el);
  else defaultCard(el, section);
  if (isNow) el.insertAdjacentHTML('beforeend', '<span class="now-tag">Maintenant</span><span class="now-sheen" aria-hidden="true"></span>');
  el.addEventListener('click', () => openSection(section, el));
  return el;
}

// ---------- Horloge (les chiffres qui changent défilent) ----------

function setClock(text, { animate = true } = {}) {
  const el = $('home-clock');
  const prev = el.dataset.v || '';
  if (prev === text) return;
  el.dataset.v = text;
  el.setAttribute('aria-label', text);
  if (prev.length !== text.length) {
    el.innerHTML = [...text].map((ch) => `<span class="d" aria-hidden="true"><i>${ch}</i></span>`).join('');
    return;
  }
  [...text].forEach((ch, i) => {
    if (ch === prev[i]) return;
    const slot = el.children[i];
    const old = slot.firstChild;
    const next = document.createElement('i');
    next.textContent = ch;
    slot.append(next);
    if (!animate || reduceMotion()) {
      old.remove();
      return;
    }
    old.animate({ transform: ['none', 'translateY(-60%)'], opacity: [1, 0], filter: ['blur(0px)', 'blur(6px)'] }, { duration: 420, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' })
      .finished.catch(() => {}).then(() => old.remove());
    next.animate({ transform: ['translateY(60%)', 'none'], opacity: [0, 1], filter: ['blur(6px)', 'blur(0px)'] }, { duration: 560, delay: 120, easing: SPRING, fill: 'backwards' });
  });
}

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function letters(el, text) {
  el.setAttribute('aria-label', text);
  let i = 0;
  el.innerHTML = text
    .split(' ')
    .map((w) => `<span class="w" aria-hidden="true">${[...w].map((ch) => `<span class="c" style="--i:${i++}">${ch}</span>`).join('')}</span>`)
    .join(' ');
}

// ---------- Accueil ----------

function renderHome() {
  const t = now();
  renderedDay = dateKey(t);
  $('home-date').textContent = formatLongDate(t);

  const streak = getStreak();
  $('home-streak').innerHTML = `<strong>${streak}</strong><span>${streak > 1 ? 'jours' : 'jour'} d’affilée</span>`;

  const hello = greeting(t.getHours());
  if ($('home-hello').getAttribute('aria-label') !== hello) letters($('home-hello'), hello);

  const { top, label } = sky.update(t);
  setThemeColor(top);
  $('home-phase').textContent = label;
  setClock(hhmm(t), { animate: introPlayed });

  const featured = sections.find((s) => s.isFeatured?.(t));
  $('home-hint').textContent = featured?.nowHint?.(t) || '';
  grid.replaceChildren(...sections.map((s) => makeTile(s, s === featured)));
}

// Chorégraphie d'entrée : le ciel se lève, l'arc se trace, l'astre glisse jusqu'à l'heure,
// le salut monte lettre par lettre, l'horloge, puis les boutons arrivent avec un ressort.
function intro() {
  introPlayed = true;
  if (reduceMotion()) return;
  $('home-sky').animate({ opacity: [0, 1] }, { duration: 1100, easing: 'ease-out', fill: 'backwards' });
  sky.intro();
  $('home-date').animate({ opacity: [0, 1], transform: ['translateY(-8px)', 'none'] }, { duration: 700, delay: 250, easing: EASE_OUT, fill: 'backwards' });
  $('home-streak').animate({ opacity: [0, 1], transform: ['scale(.8)', 'none'] }, { duration: 700, delay: 350, easing: SPRING, fill: 'backwards' });
  $('home-hello').querySelectorAll('.c').forEach((c) =>
    c.animate(
      { opacity: [0, 1], transform: ['translateY(.6em) rotate(6deg)', 'none'], filter: ['blur(10px)', 'blur(0px)'] },
      { duration: 750, delay: 380 + Number(c.style.getPropertyValue('--i')) * 32, easing: EASE_OUT, fill: 'backwards' }
    )
  );
  [...$('home-clock').children].forEach((d, i) =>
    d.firstChild.animate(
      { opacity: [0, 1], transform: ['translateY(70%)', 'none'], filter: ['blur(8px)', 'blur(0px)'] },
      { duration: 800, delay: 600 + i * 70, easing: SPRING, fill: 'backwards' }
    )
  );
  $('home-now').animate({ opacity: [0, 1], transform: ['translateY(10px)', 'none'] }, { duration: 700, delay: 950, easing: EASE_OUT, fill: 'backwards' });
  [...grid.children].forEach((tile, i) =>
    tile.animate(
      { opacity: [0, 1], transform: ['translateY(40px) scale(.96)', 'none'] },
      { duration: 900, delay: 1050 + i * 110, easing: SPRING, fill: 'backwards' }
    )
  );
}

// Parallaxe : le ciel suit légèrement le doigt.
if (!reduceMotion()) {
  home.addEventListener('pointermove', (e) => {
    sky.parallax(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
  });
}

async function openSection(section, tile) {
  if (busy || current) return;
  busy = true;
  await section.beforeOpen?.(tile);
  current = section;
  screen.className = 'screen';
  cleanup = section.open(screen, { close: closeSection }) || null;
  await openCard(tile, screen, home);
  busy = false;
}

async function closeSection() {
  if (busy || !current) return;
  busy = true;
  const id = current.id;
  renderHome(); // le bouton reflète la progression avant que l'écran s'y referme
  await closeCard(home.querySelector(`[data-id="${id}"]`), screen, home);
  cleanup?.();
  cleanup = null;
  current = null;
  screen.replaceChildren();
  setThemeColor(sky.update(now()).top);
  busy = false;
  if (reloadAfterClose) location.reload();
}

// Rafraîchit l'accueil : horloge et ciel chaque minute, nouveau jour après minuit.
let lastMinute = hhmm(now());
function refresh() {
  if (!current) renderHome();
  else if (dateKey(now()) !== renderedDay) closeSection();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refresh();
});
setInterval(() => {
  const m = hhmm(now());
  if (m !== lastMinute) {
    lastMinute = m;
    refresh();
  }
}, 1000);

renderHome();
intro();

// Mises à jour : on vérifie s'il existe une nouvelle version à l'ouverture et à chaque
// retour au premier plan. Quand elle prend la main, on recharge (après fermeture
// de l'écran ouvert, pour ne pas couper une routine en cours).
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // première installation : rien à recharger
    if (current) reloadAfterClose = true;
    else location.reload();
  });
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    } catch {
      // pas de service worker (navigation privée…) : l'app marche quand même en ligne
    }
  });
}
