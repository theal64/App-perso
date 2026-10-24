// Section Routine matinale : carte d'accueil + écran guidé avec l'effet aube.
// État stocké dans localStorage sous la clé STORAGE_KEY :
//   { "2026-10-24": ["lit", "eau", ...], "2026-10-23": [...] }
// Chaque jour a sa propre liste, donc les cases repartent à zéro chaque matin.

import { load, save } from '../storage.js';
import { dateKey, addDays } from '../date.js';
import { createSky, cssStars, glowAt, skyGradient, stageOf, starsAt } from '../sky.js';

const STORAGE_KEY = 'matin:history';
const FEATURED_UNTIL_HOUR = 11;
const DAY_TEXT_FROM = 6; // à partir de 6 étapes, le ciel est clair : texte foncé

// Les ids doivent rester stables : ils servent de clé dans l'historique.
const ROUTINE = [
  { id: 'lit', label: 'Lit + aérer' },
  { id: 'eau', label: 'Eau + se débarbouiller' },
  { id: 'qigong', label: 'Qi gong' },
  { id: 'exos', label: 'Exos courts' },
  { id: 'cafe', label: 'Café et petit-déj' },
  { id: 'dents', label: 'Dents + habillage' },
  { id: 'balade', label: 'Balade 20 min avec Teiki' },
];

const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const ICON_LIST = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function getHistory() {
  return load(STORAGE_KEY, {});
}

function getChecked() {
  const checked = getHistory()[dateKey()] || [];
  return checked.filter((id) => ROUTINE.some((item) => item.id === id));
}

function setChecked(id, value) {
  const history = getHistory();
  const today = dateKey();
  const set = new Set(history[today] || []);
  value ? set.add(id) : set.delete(id);
  history[today] = [...set];
  save(STORAGE_KEY, history);
}

function isComplete(checked = []) {
  return ROUTINE.every((item) => checked.includes(item.id));
}

function getProgress() {
  const done = getChecked().length;
  return { done, total: ROUTINE.length, complete: done === ROUTINE.length };
}

// Jours consécutifs complets. Si aujourd'hui n'est pas encore fini,
// on compte à partir d'hier pour ne pas casser la série le matin même.
export function getStreak(today = new Date()) {
  const history = getHistory();
  let day = isComplete(history[dateKey(today)]) ? today : addDays(today, -1);
  let streak = 0;
  while (isComplete(history[dateKey(day)])) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

const streakText = (n) => `${n} ${n > 1 ? 'jours' : 'jour'} d’affilée`;

// ---------- Cartes d'accueil ----------

function renderFeatured(el) {
  const { done, total } = getProgress();
  const f = stageOf(done, total);
  el.innerHTML = `
    <div class="feat-sky" style="background:${skyGradient(f)}">
      <div class="feat-stars" style="opacity:${starsAt(f)}">
        <span style="background-image:${cssStars(34, 3)}"></span>
        <span class="twinkle-a" style="background-image:${cssStars(12, 9)}"></span>
      </div>
      <div class="feat-glow" style="opacity:${glowAt(f)}"></div>
    </div>
    <div class="feat-body">
      <p class="feat-kicker">Ce matin</p>
      <h2 class="feat-title">Routine matinale</h2>
      <div class="feat-bar"><span style="width:${(done / total) * 100}%"></span></div>
      <div class="feat-row">
        <span class="feat-progress">${done} / ${total}</span>
        <span class="feat-cta">${done ? 'Continuer' : 'Commencer'}</span>
      </div>
    </div>
  `;
}

function renderCard(el) {
  const { done, total, complete } = getProgress();
  el.classList.toggle('is-done', complete);
  el.innerHTML = `
    <div class="tile-top"><span class="tile-icon" aria-hidden="true">${complete ? '✓' : '◐'}</span></div>
    <div>
      <p class="tile-title">${complete ? 'Routine faite' : 'Routine matinale'}</p>
      <p class="tile-sub">${complete ? streakText(getStreak()) : `${done} / ${total}`}</p>
    </div>
  `;
}

// ---------- Écran de la routine ----------

function open(screen, { close }) {
  screen.innerHTML = `
    <div class="sky"></div>
    <div class="screen-content routine">
      <header class="r-top">
        <button type="button" class="r-icon" data-action="close" aria-label="Retour à l’accueil">${ICON_CLOSE}</button>
        <div class="r-bar" aria-hidden="true"><span></span></div>
        <button type="button" class="r-icon" data-action="sheet" aria-label="Voir toute la routine">${ICON_LIST}</button>
      </header>
      <p class="r-count"></p>
      <div class="r-stage"></div>
      <div class="r-backdrop" data-action="sheet-close"></div>
      <section class="r-sheet" aria-label="Toute la routine" aria-hidden="true">
        <div class="r-sheet-head">
          <h2>Toute la routine</h2>
          <button type="button" class="r-sheet-ok" data-action="sheet-close">OK</button>
        </div>
        <ul class="checklist"></ul>
      </section>
    </div>
  `;

  const sky = createSky(screen.querySelector('.sky'));
  const content = screen.querySelector('.routine');
  const stage = screen.querySelector('.r-stage');
  const bar = screen.querySelector('.r-bar span');
  const count = screen.querySelector('.r-count');
  const sheet = screen.querySelector('.r-sheet');
  const list = sheet.querySelector('.checklist');
  let busy = false;

  function update({ instant = false } = {}) {
    const { done, total, complete } = getProgress();
    sky.set(done, total, { instant });
    screen.classList.toggle('is-day', done >= DAY_TEXT_FROM);
    bar.style.width = `${(done / total) * 100}%`;
    count.textContent = complete ? 'Routine complète' : `${done} / ${total}`;
  }

  function renderStage({ animate = false } = {}) {
    const checked = getChecked();
    const index = ROUTINE.findIndex((item) => !checked.includes(item.id));

    if (index === -1) {
      stage.innerHTML = `
        <div class="r-finale">
          <div class="r-finale-msg">
            <h1>Routine complète</h1>
            <p>${streakText(getStreak())}</p>
          </div>
          <button type="button" class="r-done" data-action="close">Retour à l’accueil</button>
        </div>
      `;
    } else {
      const item = ROUTINE[index];
      const after = ROUTINE.slice(index + 1).find((i) => !checked.includes(i.id));
      stage.innerHTML = `
        <article class="r-card r-step">
          <p class="r-step-num">Étape ${index + 1} sur ${ROUTINE.length}</p>
          <h1 class="r-step-title">${item.label}</h1>
          <p class="r-step-next">${after ? `Ensuite : ${after.label}` : 'Dernière étape'}</p>
          <button type="button" class="r-done" data-action="done" data-id="${item.id}">Fait</button>
        </article>
      `;
    }

    if (animate) {
      // La fin attend que le soleil ait commencé à monter.
      const delay = reduceMotion() ? 0 : index === -1 ? 1100 : 80;
      stage.firstElementChild.animate(
        { opacity: [0, 1], transform: [reduceMotion() ? 'none' : 'translateY(28px)', 'none'] },
        { duration: reduceMotion() ? 200 : 560, delay, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'backwards' }
      );
    }
  }

  async function markDone(id) {
    if (busy) return;
    busy = true;
    setChecked(id, true);
    update();
    const card = stage.firstElementChild;
    const flyAway = reduceMotion()
      ? { opacity: [1, 0] }
      : { opacity: [1, 0], transform: ['none', 'translateY(-110px) scale(.94)'] };
    await card.animate(flyAway, {
      duration: reduceMotion() ? 180 : 640,
      easing: 'cubic-bezier(.5,0,.75,0)',
      fill: 'forwards',
    }).finished;
    renderStage({ animate: true });
    busy = false;
  }

  function renderList() {
    const checked = getChecked();
    list.innerHTML = ROUTINE.map(
      (item) => `
      <li>
        <label class="check">
          <input type="checkbox" data-id="${item.id}" ${checked.includes(item.id) ? 'checked' : ''}>
          <span class="box" aria-hidden="true"></span>
          <span class="text">${item.label}</span>
        </label>
      </li>`
    ).join('');
  }

  function toggleSheet(show) {
    if (show) renderList();
    content.classList.toggle('sheet-open', show);
    sheet.setAttribute('aria-hidden', String(!show));
  }

  // Cocher dans le désordre : le ciel suit le nombre d'étapes faites.
  list.addEventListener('change', (e) => {
    setChecked(e.target.dataset.id, e.target.checked);
    update();
    renderStage();
  });

  content.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'close') close();
    else if (action === 'done') markDone(target.dataset.id);
    else if (action === 'sheet') toggleSheet(true);
    else if (action === 'sheet-close') toggleSheet(false);
  });

  update({ instant: true });
  renderStage();

  return () => sky.destroy();
}

export default {
  id: 'matin',
  title: 'Routine matinale',
  // En vedette jusqu'à 11 h, ou jusqu'à ce que la routine soit faite.
  isFeatured: (now) => now.getHours() < FEATURED_UNTIL_HOUR && !getProgress().complete,
  renderFeatured,
  renderCard,
  open,
};
