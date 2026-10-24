// Point d'entrée : accueil (carte vedette + grille) et ouverture des sections.

import { sections } from './tabs/index.js';
import { getStreak } from './tabs/matin.js';
import { dateKey, formatLongDate } from './date.js';
import { openCard, closeCard } from './transition.js';
import { setThemeColor } from './theme.js';

const home = document.getElementById('home');
const screen = document.getElementById('screen');
const featuredSlot = document.getElementById('featured');
const grid = document.getElementById('grid');

let current = null; // section ouverte
let cleanup = null;
let busy = false;
let renderedDay = dateKey();

function defaultCard(el, section) {
  el.classList.toggle('is-soon', !!section.soon);
  el.innerHTML = `
    <div class="tile-top">
      <span class="tile-icon" aria-hidden="true">${section.icon}</span>
      ${section.soon ? '<span class="badge">Bientôt</span>' : ''}
    </div>
    <p class="tile-title">${section.title}</p>
  `;
}

function makeTile(section, featured) {
  const el = document.createElement('button');
  el.type = 'button';
  el.dataset.id = section.id;
  el.className = featured ? 'tile feat' : 'tile tile-small';
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

renderHome();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
