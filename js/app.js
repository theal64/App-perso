// Point d'entrée : en-tête du jour, barre d'onglets, routage par #hash.

import { tabs } from './tabs/index.js';
import { dateKey, formatLongDate } from './date.js';

const MESSAGES = [
  'Un pas après l’autre.',
  'Doucement, mais sûrement.',
  'Respire, tu as le temps.',
  'Aujourd’hui compte.',
  'Petit à petit, l’oiseau fait son nid.',
  'Commence simple.',
  'Sois présent à ce que tu fais.',
];

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let renderedDay = dateKey();

function renderHeader() {
  const now = new Date();
  document.getElementById('today-date').textContent = formatLongDate(now);
  // Un message par jour, stable dans la journée.
  const dayIndex = Math.floor(now.setHours(0, 0, 0, 0) / 86400000);
  document.getElementById('today-message').textContent = MESSAGES[dayIndex % MESSAGES.length];
}

function renderTabbar() {
  tabbar.innerHTML = tabs
    .map(
      (tab) => `
      <a href="#${tab.id}" class="tab ${tab.soon ? 'is-soon' : ''}" data-id="${tab.id}">
        <span class="tab-icon" aria-hidden="true">${tab.icon}</span>
        <span class="tab-label">${tab.label}</span>
        ${tab.soon ? '<span class="tab-soon">Bientôt</span>' : ''}
      </a>`
    )
    .join('');
}

function currentTab() {
  const id = location.hash.slice(1);
  return tabs.find((t) => t.id === id) || tabs[0];
}

function renderView() {
  const tab = currentTab();
  tabbar.querySelectorAll('.tab').forEach((el) => {
    const active = el.dataset.id === tab.id;
    el.classList.toggle('is-active', active);
    el.toggleAttribute('aria-current', active);
  });
  view.innerHTML = '';
  tab.render(view);
}

function renderAll() {
  renderedDay = dateKey();
  renderHeader();
  renderView();
}

// Si l'app reste ouverte (ou revient au premier plan) après minuit, on repart à zéro.
function refreshIfNewDay() {
  if (dateKey() !== renderedDay) renderAll();
}

window.addEventListener('hashchange', renderView);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshIfNewDay();
});
setInterval(refreshIfNewDay, 60 * 1000);

renderTabbar();
renderAll();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
