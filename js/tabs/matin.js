// Onglet Matin : checklist quotidienne + compteur de jours consécutifs.
// État stocké dans localStorage sous la clé STORAGE_KEY :
//   { "2026-10-24": ["lit", "eau", ...], "2026-10-23": [...] }
// Chaque jour a sa propre liste, donc les cases repartent à zéro chaque matin.

import { load, save } from '../storage.js';
import { dateKey, addDays } from '../date.js';

const STORAGE_KEY = 'matin:history';

// Les ids doivent rester stables : ils servent de clé dans l'historique.
const ROUTINE = [
  { id: 'lit', label: 'Lit + aérer' },
  { id: 'eau', label: 'Eau + se débarbouiller' },
  { id: 'qigong', label: 'Qi gong' },
  { id: 'exos', label: 'Exos courts' },
  { id: 'cafe', label: 'Café / petit-déj' },
  { id: 'dents', label: 'Dents + habillage' },
  { id: 'balade', label: 'Balade 20 min avec Teiki' },
];

function getHistory() {
  return load(STORAGE_KEY, {});
}

function isComplete(checked = []) {
  return ROUTINE.every((item) => checked.includes(item.id));
}

// Jours consécutifs complets. Si aujourd'hui n'est pas encore fini,
// on compte à partir d'hier pour ne pas casser la série le matin même.
function computeStreak(history, today = new Date()) {
  let day = isComplete(history[dateKey(today)]) ? today : addDays(today, -1);
  let streak = 0;
  while (isComplete(history[dateKey(day)])) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

function render(container) {
  const today = dateKey();
  const history = getHistory();
  const checked = history[today] || [];
  const done = checked.filter((id) => ROUTINE.some((i) => i.id === id)).length;
  const complete = isComplete(checked);
  const streak = computeStreak(history);

  container.innerHTML = `
    <section class="card streak ${complete ? 'is-complete' : ''}">
      <div>
        <p class="streak-count">${streak}</p>
        <p class="streak-label">${streak > 1 ? 'jours d’affilée' : 'jour d’affilée'}</p>
      </div>
      <p class="streak-status">${complete ? 'Routine complète ✓' : `${done} / ${ROUTINE.length}`}</p>
    </section>

    <section class="card">
      <h1 class="card-title">Routine du matin</h1>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${ROUTINE.length}" aria-valuenow="${done}">
        <span style="width:${(done / ROUTINE.length) * 100}%"></span>
      </div>
      <ul class="checklist">
        ${ROUTINE.map(
          (item) => `
          <li>
            <label class="check">
              <input type="checkbox" data-id="${item.id}" ${checked.includes(item.id) ? 'checked' : ''}>
              <span class="box" aria-hidden="true"></span>
              <span class="text">${item.label}</span>
            </label>
          </li>`
        ).join('')}
      </ul>
    </section>
  `;

  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', () => {
      const h = getHistory();
      const set = new Set(h[today] || []);
      input.checked ? set.add(input.dataset.id) : set.delete(input.dataset.id);
      h[today] = [...set];
      save(STORAGE_KEY, h);
      render(container);
    });
  });
}

export default {
  id: 'matin',
  label: 'Matin',
  icon: '◐',
  render,
};
