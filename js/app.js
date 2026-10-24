// Point d'entrée : accueil (carte vedette + grille) et ouverture des sections.

import { sections } from './tabs/index.js';
import { getStreak } from './tabs/matin.js';
import { dateKey, formatLongDate } from './date.js';
import { openCard, closeCard } from './transition.js';
import { setThemeColor } from './theme.js';
import { cssStars } from './sky.js';
import { CHEVRON } from './icons.js';

const home = document.getElementById('home');
const screen = document.getElementById('screen');
const featuredSlot = document.getElementById('featured');
const grid = document.getElementById('grid');

let current = null; // section ouverte
let cleanup = null;
let busy = false;
let renderedDay = dateKey();
let reloadAfterClose = false; // une nouvelle version attend la fermeture de l'écran

// Tuile de menu par défaut : icône, titre, sous-titre, puis "Bientôt" ou chevron.
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

function makeTile(section, featured) {
  const el = document.createElement('button');
  el.type = 'button';
  el.dataset.id = section.id;
  el.className = featured ? 'tile feat' : 'tile tile-row';
  if (featured) section.renderFeatured(el);
  else if (section.renderCard) section.renderCard(el);
  else defaultCard(el, section);
  el.addEventListener('click', () => openSection(section, el));
  return el;
}

function renderHome() {
  const now = new Date();
  renderedDay = dateKey(now);
  document.getElementById('home-date').textContent = formatLongDate(now);

  const streak = getStreak();
  document.getElementById('home-streak').innerHTML =
    `<strong>${streak}</strong><span>${streak > 1 ? 'jours' : 'jour'} d’affilée</span>`;

  const featured = sections.find((s) => s.isFeatured?.(now));
  featuredSlot.replaceChildren(...(featured ? [makeTile(featured, true)] : []));
  grid.replaceChildren(...sections.filter((s) => s !== featured).map((s) => makeTile(s, false)));
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
  renderHome(); // la carte reflète la progression avant que l'écran s'y referme
  await closeCard(home.querySelector(`[data-id="${id}"]`), screen, home);
  cleanup?.();
  cleanup = null;
  current = null;
  screen.replaceChildren();
  setThemeColor(null);
  busy = false;
  if (reloadAfterClose) location.reload();
}

// Rafraîchit l'accueil (carte vedette à 11 h, nouveau jour après minuit).
function refresh() {
  if (!current) renderHome();
  else if (dateKey() !== renderedDay) closeSection();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refresh();
});
setInterval(refresh, 60 * 1000);

// Étoiles du ciel de l'accueil (fixes, une couche scintille doucement).
const [stars, twinkle] = document.querySelectorAll('.home-sky span');
stars.style.backgroundImage = cssStars(110, 21);
twinkle.style.backgroundImage = cssStars(30, 37);

renderHome();

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
