// Section Routine matinale : carte d'accueil + écran avec l'effet aube et les minuteurs.
// Historique dans localStorage sous HISTORY_KEY :
//   { "2026-10-24": ["lit", "eau", ...], "2026-10-23": [...] }
// Chaque jour a sa propre liste, donc les cases repartent à zéro chaque matin.
// Le déroulé minuté en cours est sauvegardé sous RUN_KEY pour reprendre à la réouverture.

import { load, save } from '../storage.js';
import { dateKey, addDays } from '../date.js';
import { createEndSky } from '../endsky.js';
import { unlockAudio, chime } from '../chime.js';
import {
  PREVIEW_SPEED, buildPlan, departFor, fmtCD, fmtHM, getPrefs, planText,
  previewStart, savePrefs, stepCue, stepDur,
} from './matin-plan.js';
import { FIGURES, FIGURE_PERIOD } from './matin-figures.js';
import { SUN_ICON, riseIcon, setIcon } from './matin-icon.js';
import { CHEVRON } from '../icons.js';

const HISTORY_KEY = 'matin:history';
const RUN_KEY = 'matin:run';
const FEATURED_UNTIL_HOUR = 11;

// Phases du fond (design/DESIGN.md §6) selon la position dans la routine :
// index de l'étape en cours (0 lit … 6 balade) + avancement dans l'étape ; 7 = écran Départ.
function skyPhase(pos) {
  if (pos < 2) return { awake: 0, dawn: 0 }; // 1 · nuit endormie (lit, eau)
  if (pos < 3) return { awake: pos - 2, dawn: 0 }; // 2 · éveil (qi gong)
  if (pos < 6) return { awake: 1, dawn: (0.4 * (pos - 3)) / 3 }; // 3 · fin du monde (exos, café, dents)
  if (pos < 7) return { awake: 1, dawn: 0.4 + 0.45 * (pos - 6) }; // 4 · aube (balade)
  return { awake: 1, dawn: 1 }; // 4 · départ
}

// Rythme du fond lié à l'étape (modes du prototype).
const SUB_SKY_MODE = { bounce: 'shake', swing: 'swing', stretch: 'sky' };
const STEP_SKY_MODE = { exos: 'pulse', cafe: 'steam', dents: 'flow', balade: 'walk' };

const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const ICON_LIST = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// TEMPORAIRE (tests) : remet la routine du jour à zéro. À retirer ensuite.
const RESET_BUTTON = '<button type="button" class="r-reset" data-action="reset">↺ Réinitialiser aujourd’hui (test)</button><span class="r-version"></span>';

// Affiche la version en cache (ex. "version v6") pour savoir si la mise à jour est arrivée.
function showVersion(root) {
  const el = root.querySelector('.r-version');
  if (!el || !window.caches) return;
  caches.keys().then((keys) => {
    const key = keys.find((k) => k.startsWith('routine-'));
    if (key) el.textContent = `version ${key.replace('routine-', '')}`;
  }).catch(() => {});
}

// ---------- Données ----------

function getHistory() {
  return load(HISTORY_KEY, {});
}

function getChecked() {
  const checked = getHistory()[dateKey()] || [];
  return checked.filter((id) => buildPlan().some((step) => step.id === id));
}

function setChecked(id, value) {
  const history = getHistory();
  const today = dateKey();
  const set = new Set(history[today] || []);
  value ? set.add(id) : set.delete(id);
  history[today] = [...set];
  save(HISTORY_KEY, history);
}

function isComplete(checked = []) {
  return buildPlan().every((step) => checked.includes(step.id));
}

function getProgress() {
  const done = getChecked().length;
  const total = buildPlan().length;
  return { done, total, complete: done === total };
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

// Revenu de l'écran de la routine : le soleil de l'icône se recouche sur l'accueil.
let iconSetsOnReturn = false;

function playIconReturn(el, complete) {
  if (!iconSetsOnReturn) return;
  iconSetsOnReturn = false;
  if (complete) return; // routine faite : le soleil reste levé
  el.classList.add('ico-on');
  setTimeout(() => setIcon(el), 520); // après la fermeture de l'écran
}

function renderCard(el) {
  const { done, total, complete } = getProgress();
  el.classList.toggle('ico-on', complete);
  el.innerHTML = `
    ${SUN_ICON}
    <span class="t-txt">
      <span class="t1">${complete ? 'Routine faite' : 'Routine du matin'}</span>
      <span class="t2">${complete ? streakText(getStreak()) : `${done} / ${total} étapes`}</span>
    </span>
    ${CHEVRON}
  `;
  playIconReturn(el, complete);
}

// ---------- Déroulé minuté ----------
// Le temps du déroulé ("clock", en ms) avance avec l'horloge réelle (×20 en aperçu)
// et s'arrête pendant la pause. Tout est calculé à partir d'horodatages, donc le
// minuteur reste juste même si l'écran est verrouillé ou l'app fermée.

function loadRun() {
  const run = load(RUN_KEY, null);
  return run && run.day === dateKey() ? run : null;
}

const clockNow = (run, now = Date.now()) => run.clockAt + (run.paused ? 0 : (now - run.realAt) * run.speed);
const wallNow = (run, now = Date.now()) => (run.speed === 1 ? now : run.simStart + clockNow(run, now));
const wallAt = (run, clock) => wallNow(run) - (clockNow(run) - clock);

// L'aperçu ne touche pas à l'historique : il coche dans sa propre liste.
const doneIds = (run) => (run?.speed > 1 ? run.previewDone : getChecked());

function kinetic(el, text) {
  el.replaceChildren();
  el.setAttribute('aria-label', text);
  let i = 0;
  text.split(' ').forEach((word, wi, words) => {
    const w = document.createElement('span');
    w.className = 'w';
    w.setAttribute('aria-hidden', 'true');
    [...word].forEach((ch) => {
      const c = document.createElement('span');
      c.className = 'c';
      c.style.setProperty('--i', i++);
      c.textContent = ch;
      w.append(c);
    });
    el.append(w);
    if (wi < words.length - 1) {
      el.append(' ');
      i++;
    }
  });
}

// ---------- Motion design ----------

const EASE_OUT = 'cubic-bezier(.2,.75,.2,1)';

// Entrée en cascade des enfants de `root`.
function stagger(root, base = 0, step = 70) {
  if (reduceMotion()) return;
  [...root.children].forEach((child, i) =>
    child.animate(
      { opacity: [0, 1], transform: ['translateY(18px)', 'none'] },
      { duration: 700, delay: base + i * step, easing: EASE_OUT, fill: 'backwards' }
    )
  );
}

// Compte à rebours : seuls les chiffres qui changent défilent.
function setDigits(el, text) {
  const prev = el.dataset.v || '';
  if (prev === text) return;
  el.dataset.v = text;
  el.setAttribute('aria-label', text);
  if (prev.length !== text.length) {
    el.innerHTML = [...text].map((ch) => `<span aria-hidden="true">${ch}</span>`).join('');
    return;
  }
  [...text].forEach((ch, i) => {
    if (ch === prev[i]) return;
    const span = el.children[i];
    span.textContent = ch;
    if (!reduceMotion()) {
      span.animate(
        { transform: ['translateY(-38%)', 'none'], opacity: [0, 1] },
        { duration: 320, easing: EASE_OUT }
      );
    }
  });
}

// Particules de lumière qui montent sur l'écran de fin.
function lightMotes() {
  const box = document.createElement('div');
  box.className = 'r-motes';
  box.setAttribute('aria-hidden', 'true');
  if (reduceMotion()) return box;
  for (let i = 0; i < 22; i++) {
    const m = document.createElement('i');
    m.style.left = `${Math.random() * 100}%`;
    m.style.setProperty('--s', `${3 + Math.random() * 5}px`);
    box.append(m);
    m.animate(
      {
        transform: ['translate(0, 0)', `translate(${(Math.random() - 0.5) * 60}px, -${45 + Math.random() * 30}vh)`],
        opacity: [0, 0.9, 0],
      },
      { duration: 4000 + Math.random() * 3000, delay: 600 + Math.random() * 3000, iterations: Infinity, easing: 'cubic-bezier(.3,.6,.4,1)' }
    );
  }
  return box;
}

const ringTicks = Array.from({ length: 60 }, (_, k) => {
  const a = (k / 60) * Math.PI * 2;
  const r1 = k % 5 ? 82 : 79;
  const p = (r) => `${(100 + Math.cos(a) * r).toFixed(2)}`;
  const q = (r) => `${(100 + Math.sin(a) * r).toFixed(2)}`;
  return `<line class="tk" x1="${p(r1)}" y1="${q(r1)}" x2="${p(85)}" y2="${q(85)}"/>`;
}).join('');

// ---------- Écran de la routine ----------

function open(screen, { close }) {
  screen.innerHTML = `
    <div class="endsky"></div>
    <div class="screen-content routine">
      <header class="r-top">
        <button type="button" class="r-icon" data-action="close" aria-label="Retour à l’accueil">${ICON_CLOSE}</button>
        <div class="r-bar" aria-hidden="true"></div>
        <button type="button" class="r-icon r-list-btn" data-action="sheet" aria-label="Voir toute la routine">${ICON_LIST}</button>
      </header>
      <div class="r-view"></div>
      <div class="r-backdrop" data-action="sheet-close"></div>
      <section class="r-sheet" aria-label="Toute la routine" aria-hidden="true">
        <div class="r-sheet-head">
          <h2>Toute la routine</h2>
          <button type="button" class="r-sheet-ok" data-action="sheet-close">OK</button>
        </div>
        <ul class="checklist"></ul>
      </section>
      <div class="r-tag" hidden>APERÇU ×${PREVIEW_SPEED}</div>
    </div>
  `;

  const sky = createEndSky(screen.querySelector('.endsky'));
  const content = screen.querySelector('.routine');
  const view = content.querySelector('.r-view');
  const bar = content.querySelector('.r-bar');
  const sheet = content.querySelector('.r-sheet');
  const list = sheet.querySelector('.checklist');
  const tag = content.querySelector('.r-tag');

  let prefs = getPrefs();
  let plan = buildPlan(prefs);
  let run = loadRun();
  let raf = 0;
  let wake = null;
  let ui = null; // éléments de la vue minutée
  let litTicks = -1;
  let sub = -1;
  let showingEnd = false; // écran Départ affiché

  const persist = () => run && run.speed === 1 && save(RUN_KEY, run);
  const currentStep = () => plan.find((s) => !doneIds(run).includes(s.id));

  // Fond : position dans la routine (étape en cours + avancement ; 7 = Départ) → phase.
  // Pendant le déroulé minuté, tick() passe la position exacte à chaque image.
  function updateSky({ instant = false, pos, mode = 'calm' } = {}) {
    if (pos === undefined) {
      const i = plan.findIndex((s) => !doneIds(run).includes(s.id));
      pos = showingEnd || i === -1 ? plan.length : i;
      if (showingEnd) mode = 'ring';
      // Déroulé en cours : on reprend à l'avancement exact de l'étape.
      else if (run && plan[i]?.id === run.stepId && run.stepDur) {
        pos += Math.min(1, Math.max(0, (clockNow(run) - run.stepClock) / 1000 / run.stepDur));
      }
    }
    const { awake, dawn } = skyPhase(pos);
    sky.set(awake, dawn, mode, { instant });
  }

  function renderBar() {
    const done = doneIds(run);
    if (bar.children.length !== plan.length) bar.innerHTML = plan.map(() => '<span><i></i></span>').join('');
    plan.forEach((s, i) => (bar.children[i].firstChild.style.width = done.includes(s.id) ? '100%' : '0%'));
  }

  async function requestWake() {
    if (!run || run.speed > 1 || wake || !navigator.wakeLock || document.hidden) return;
    try {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => (wake = null));
    } catch {
      wake = null;
    }
  }

  function releaseWake() {
    wake?.release().catch(() => {});
    wake = null;
  }

  // --- Vue de départ : options + lancement ---

  function showStart({ animate = true } = {}) {
    cancelAnimationFrame(raf);
    ui = null;
    showingEnd = false;
    const remaining = plan.filter((s) => !getChecked().includes(s.id));
    const seg = (key, value, label) =>
      `<button type="button" data-action="pref" data-key="${key}" data-value="${value}" aria-pressed="${prefs[key] === value}">${label}</button>`;
    view.className = 'r-view r-start';
    view.innerHTML = `
      <div class="r-hero">
        <span class="r-eyebrow">Mode matin</span>
        <h1 class="r-h1"><span class="ln"><span>Lève-toi.</span></span><span class="ln"><em>Suis le rythme.</em></span></h1>
        <p class="r-plan">${planText(prefs, remaining)}</p>
      </div>
      <div class="r-opts">
        <div class="r-seg" role="group" aria-label="Type de journée">
          ${seg('mode', 'poste', 'Jour de poste')}${seg('mode', 'off', 'Jour off')}
        </div>
        <div class="r-seg" role="group" aria-label="Jeûne">
          ${seg('jeune', false, 'Petit-déj')}${seg('jeune', true, 'Jeûne')}
        </div>
        <button type="button" class="r-chip" data-action="sound" aria-pressed="${prefs.sound}">Son : ${prefs.sound ? 'oui' : 'non'}</button>
      </div>
      <div class="r-go">
        <button type="button" class="r-cta" data-action="start">${remaining.length < plan.length ? 'Reprendre la routine' : 'Je suis levé'}</button>
        <button type="button" class="r-ghost" data-action="preview">Voir en accéléré (×${PREVIEW_SPEED})</button>
      </div>
      <p class="r-rule">Lance, pose l’écran, ne scrolle pas. Le téléphone reste à la maison pendant la balade.</p>
      ${RESET_BUTTON}
    `;
    showVersion(view);
    if (animate && !reduceMotion()) {
      stagger(view, 120);
      // Les deux lignes du titre montent depuis leur ligne de base.
      view.querySelectorAll('.r-h1 .ln > *').forEach((line, i) =>
        line.animate(
          { transform: ['translateY(105%)', 'none'] },
          { duration: 900, delay: 220 + i * 130, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }
        )
      );
    }
  }

  function setPref(key, value) {
    prefs = { ...prefs, [key]: value };
    savePrefs(prefs);
    plan = buildPlan(prefs);
    renderBar();
    showStart({ animate: false });
  }

  // --- Vue minutée ---

  function showRun() {
    view.className = 'r-view r-run';
    view.innerHTML = `
      <div class="r-run-top">
        <span class="r-clock"></span>
        <span class="r-pill"></span>
      </div>
      <div class="r-stage">
        <h2 class="r-kin" aria-live="polite"></h2>
        <div class="r-ring">
          <div class="r-ripple"></div>
          <div class="r-breath"></div>
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <g class="r-ticks">${ringTicks}</g>
            <circle class="trk" cx="100" cy="100" r="92"/>
            <circle class="prg" cx="100" cy="100" r="92" pathLength="1" stroke-dashoffset="1"/>
          </svg>
          <div class="r-mid">
            <span class="r-sub"></span>
            <div class="r-fig"></div>
            <span class="r-cd"></span>
          </div>
        </div>
        <p class="r-cue"></p>
        <span class="r-next"></span>
      </div>
      <div class="r-bot">
        <button type="button" class="r-stop" data-action="stop">Arrêter</button>
        <button type="button" data-action="pause">${run.paused ? 'Reprendre' : 'Pause'}</button>
        <button type="button" class="r-fait" data-action="next">Fait →</button>
      </div>
    `;
    const $ = (sel) => view.querySelector(sel);
    ui = {
      clock: $('.r-clock'), pill: $('.r-pill'), kin: $('.r-kin'), breath: $('.r-breath'),
      prg: $('.prg'), ticks: [...view.querySelectorAll('.tk')], sub: $('.r-sub'), cd: $('.r-cd'),
      cue: $('.r-cue'), next: $('.r-next'), pause: $('[data-action="pause"]'),
      ring: $('.r-ring'), ripple: $('.r-ripple'), fig: $('.r-fig'),
    };
    litTicks = -1;
    tag.hidden = run.speed === 1;
    content.classList.toggle('is-preview', run.speed > 1);
    view.classList.toggle('is-paused', run.paused);
    renderStep();
    stagger(view, 60, 90);
    if (!reduceMotion()) {
      ui.ring.animate(
        { transform: ['scale(.86) rotate(-12deg)', 'none'], opacity: [0, 1] },
        { duration: 1100, delay: 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }
      );
    }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  // L'ancien titre s'envole en se floutant pendant que le nouveau monte.
  function exitTitle() {
    if (reduceMotion() || !ui.kin.textContent) return false;
    const ghost = ui.kin.cloneNode(true);
    ghost.className = 'r-kin r-kin-ghost';
    ghost.removeAttribute('aria-live');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.top = `${ui.kin.offsetTop}px`;
    ghost.querySelectorAll('.c').forEach((c) => (c.style.animation = 'none'));
    ui.kin.parentNode.append(ghost);
    ghost
      .animate(
        { opacity: [1, 0], transform: ['none', 'translateY(-42px) scale(.96)'], filter: ['blur(0px)', 'blur(8px)'] },
        { duration: 520, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }
      )
      .finished.catch(() => {})
      .then(() => ghost.remove());
    return true;
  }

  function renderStep({ exit = false } = {}) {
    const step = plan.find((s) => s.id === run.stepId);
    if (!step || !ui) return;
    const index = plan.indexOf(step);
    sub = -1;
    ui.kin.style.setProperty('--base', exit && exitTitle() ? '260ms' : '0ms');
    kinetic(ui.kin, step.label);
    ui.ring.classList.toggle('has-fig', !!step.subs);
    ui.fig.replaceChildren();
    if (exit && !reduceMotion()) {
      [ui.cue, ui.next].forEach((el, i) =>
        el.animate(
          { opacity: [0, 1], transform: ['translateY(10px)', 'none'] },
          { duration: 600, delay: 420 + i * 80, easing: EASE_OUT, fill: 'backwards' }
        )
      );
    }
    ui.sub.textContent = '';
    ui.cue.className = 'r-cue';
    ui.cue.textContent = step.subs ? '' : stepCue(step, prefs, wallAt(run, run.stepClock), run.stepDur);
    const after = plan.slice(index + 1).find((s) => !doneIds(run).includes(s.id));
    const afterDur = after && stepDur(after, prefs, wallAt(run, run.stepClock + run.stepDur * 1000));
    ui.next.textContent = after ? `Ensuite : ${after.label} · ${Math.round(afterDur / 60)} min` : 'Ensuite : départ';
  }

  // Démarre l'étape courante (la première non faite) au temps `clock`.
  function enterStep(clock, { sound = true } = {}) {
    const step = currentStep();
    if (!step) return finish(clock);
    run.stepId = step.id;
    run.stepClock = clock;
    run.stepDur = stepDur(step, prefs, wallAt(run, clock));
    persist();
    renderBar();
    renderStep({ exit: true });
    if (sound && prefs.sound) chime();
  }

  // Étape validée : onde qui part de l'anneau, petit rebond, segment qui s'illumine.
  function celebrate(id) {
    if (!ui || reduceMotion()) return;
    ui.ripple.animate(
      { transform: ['scale(.92)', 'scale(1.4)'], opacity: [0.9, 0] },
      { duration: 950, easing: 'cubic-bezier(.2,.7,.3,1)' }
    );
    ui.ring.animate(
      { transform: ['scale(1)', 'scale(1.045)', 'scale(1)'] },
      { duration: 560, easing: 'cubic-bezier(.3,.7,.3,1)' }
    );
    bar.children[plan.findIndex((s) => s.id === id)]?.animate(
      { transform: ['scaleY(1)', 'scaleY(2.6)', 'scaleY(1)'], filter: ['brightness(1)', 'brightness(1.9)', 'brightness(1)'] },
      { duration: 650, easing: 'ease-out' }
    );
  }

  function completeStep(id) {
    if (run.speed > 1) run.previewDone.push(id);
    else setChecked(id, true);
    updateSky();
    celebrate(id);
  }

  function startRun(speed) {
    unlockAudio();
    const now = Date.now();
    run = {
      day: dateKey(), speed, clockAt: 0, realAt: now, paused: false,
      simStart: speed > 1 ? previewStart(prefs) : now, previewDone: [],
    };
    showingEnd = false;
    enterStep(0, { sound: false });
    if (!run) return; // tout était déjà fait
    updateSky();
    renderBar();
    showRun();
    requestWake();
  }

  function stopRun() {
    cancelAnimationFrame(raf);
    releaseWake();
    run = null;
    save(RUN_KEY, null);
    tag.hidden = true;
    content.classList.remove('is-preview');
    showingEnd = false;
    updateSky();
    renderBar();
    showStart();
  }

  function togglePause() {
    const now = Date.now();
    if (run.paused) {
      run.realAt = now;
      run.paused = false;
    } else {
      run.clockAt = clockNow(run, now);
      run.realAt = now;
      run.paused = true;
    }
    persist();
    ui.pause.textContent = run.paused ? 'Reprendre' : 'Pause';
    view.classList.toggle('is-paused', run.paused);
  }

  function tick() {
    if (!run || !ui) return;
    const clock = clockNow(run);

    // Étape(s) écoulée(s) : on valide et on passe à la suite (rattrape si l'écran était verrouillé).
    let guard = 0;
    while (run && ui && clock - run.stepClock >= run.stepDur * 1000 && guard++ < 10) {
      const end = run.stepClock + run.stepDur * 1000;
      completeStep(run.stepId);
      enterStep(end);
    }
    if (!run || !ui) return;

    const step = plan.find((s) => s.id === run.stepId);
    const el = (clock - run.stepClock) / 1000;
    const p = Math.min(1, el / run.stepDur);
    const now = wallNow(run);

    setDigits(ui.cd, fmtCD(run.stepDur - el));
    ui.ring.classList.toggle('is-ending', run.stepDur - el <= 10 && !run.paused);
    ui.prg.style.strokeDashoffset = String(1 - p);
    const lit = Math.floor(p * 60);
    if (lit !== litTicks) {
      litTicks = lit;
      ui.ticks.forEach((t, k) => t.classList.toggle('on', k < lit));
    }
    const seg = bar.children[plan.indexOf(step)];
    if (seg) seg.firstChild.style.width = `${p * 100}%`;
    ui.clock.textContent = `Étape ${plan.indexOf(step) + 1} sur ${plan.length} · ${fmtHM(new Date(now))}`;

    // Projection de l'heure de fin / de départ.
    let at = now + (run.stepDur - el) * 1000;
    plan
      .filter((s) => s !== step && !doneIds(run).includes(s.id))
      .forEach((s) => (at += stepDur(s, prefs, at) * 1000));
    if (prefs.mode === 'poste') {
      const m = Math.round((departFor(now) - at) / 60000);
      ui.pill.textContent = `Départ prévu ${fmtHM(new Date(at))} · ${m >= 0 ? `marge ${m} min` : `retard ${-m} min`}`;
      ui.pill.className = `r-pill ${m >= 10 ? 'ok' : m >= 0 ? 'warn' : 'late'}`;
    } else {
      ui.pill.textContent = `Fin prévue ${fmtHM(new Date(at))}`;
      ui.pill.className = 'r-pill ok';
    }

    // Respiration de l'anneau et sous-étapes du qi gong (rythmes en temps réel).
    const rt = performance.now() / 1000;
    let scale = 0.8 + Math.sin(rt * 0.6) * 0.04;
    let skyMode = STEP_SKY_MODE[step.id] || 'calm';
    if (step.subs) {
      let acc = 0;
      let si = 0;
      for (; si < step.subs.length - 1 && el >= acc + step.subs[si].t; si++) acc += step.subs[si].t;
      const s = step.subs[si];
      if (SUB_SKY_MODE[s.fig]) skyMode = SUB_SKY_MODE[s.fig];
      if (si !== sub) {
        sub = si;
        ui.sub.textContent = `${si + 1}/${step.subs.length} · ${s.name}`;
        if (si > 0 && prefs.sound) chime(784, 1046);
        // Silhouette du mouvement, calée sur le rythme du texte (Gauche / Droite, Inspire / Expire).
        ui.fig.innerHTML = FIGURES[s.fig] || '';
        const period = FIGURE_PERIOD[s.fig];
        if (period) ui.fig.style.setProperty('--sync', `-${(rt % period).toFixed(2)}s`);
        if (!reduceMotion()) {
          ui.fig.animate(
            { opacity: [0, 1], transform: ['scale(.85)', 'none'] },
            { duration: 500, easing: EASE_OUT }
          );
        }
      }
      if (s.cue === 'swing') {
        ui.cue.className = 'r-cue big';
        ui.cue.textContent = Math.floor(rt / 1.2) % 2 === 0 ? '← Gauche' : 'Droite →';
      } else if (s.cue === 'breath') {
        const ph = (rt % 8) / 8;
        const inhale = ph < 0.5;
        const e = inhale ? ph * 2 : 1 - (ph - 0.5) * 2;
        ui.cue.className = 'r-cue big';
        ui.cue.textContent = inhale ? 'Inspire' : 'Expire';
        scale = 0.7 + 0.55 * (0.5 - 0.5 * Math.cos(e * Math.PI));
      } else {
        ui.cue.className = 'r-cue';
        ui.cue.textContent = s.cue;
        if (s.fig === 'bounce') scale = 0.8 + Math.abs(Math.sin(rt * Math.PI * 2.2)) * 0.12;
      }
    }
    if (!reduceMotion()) ui.breath.style.transform = `scale(${scale})`;
    updateSky({ pos: plan.indexOf(step) + p, mode: skyMode });

    raf = requestAnimationFrame(tick);
  }

  // --- Fin ---

  function finish(endClock) {
    const timed = !!run;
    const wasPreview = run?.speed > 1;
    let line = '';
    if (timed) {
      const endMs = wallAt(run, endClock);
      line = `Parti à <b>${fmtHM(new Date(endMs))}</b>`;
      if (prefs.mode === 'poste') {
        const m = Math.round((departFor(endMs) - endMs) / 60000);
        line += m >= 0 ? ` · <b>${m} min</b> d’avance sur 7h00` : ` · <b>${-m} min</b> de retard`;
      } else {
        line += ` · routine faite en ${Math.round(endClock / 60000)} min`;
      }
    }
    cancelAnimationFrame(raf);
    releaseWake();
    ui = null;
    if (!wasPreview) {
      run = null;
      save(RUN_KEY, null);
    }
    tag.hidden = true;
    showingEnd = true;
    updateSky();
    renderBar();

    view.className = 'r-view r-end';
    view.innerHTML = `
      <span class="r-eyebrow">${wasPreview ? 'Aperçu terminé' : 'Routine tenue'}</span>
      <h2 class="r-kin r-end-kin"></h2>
      ${line ? `<p class="r-endtime">${line}</p>` : ''}
      <p class="r-motto">Ne jamais rater deux fois.</p>
      ${wasPreview ? '' : `<p class="r-streak">${streakText(getStreak())}</p>`}
      <button type="button" class="r-cta" data-action="${wasPreview ? 'end-preview' : 'close'}">${wasPreview ? 'Retour' : 'Retour à l’accueil'}</button>
      ${wasPreview ? '' : RESET_BUTTON}
    `;
    const kin = view.querySelector('.r-kin');
    kin.style.setProperty('--base', timed ? '900ms' : '150ms');
    kinetic(kin, timed ? 'Départ' : 'Routine complète');
    showVersion(view);
    if (timed && prefs.sound) {
      chime(523, 784);
      setTimeout(() => chime(659, 988), 380);
    }
    stagger(view, timed ? 800 : 80, 110);
    view.prepend(lightMotes());
  }

  // --- Liste complète : cocher dans le désordre ---

  function renderList() {
    const checked = getChecked();
    list.innerHTML = plan
      .map(
        (s) => `
      <li>
        <label class="check">
          <input type="checkbox" data-id="${s.id}" ${checked.includes(s.id) ? 'checked' : ''}>
          <span class="box" aria-hidden="true"></span>
          <span class="text">${s.label}</span>
        </label>
      </li>`
      )
      .join('');
  }

  function toggleSheet(show) {
    if (show) {
      renderList();
      stagger(list, 140, 45);
    }
    content.classList.toggle('sheet-open', show);
    sheet.setAttribute('aria-hidden', String(!show));
  }

  list.addEventListener('change', (e) => {
    setChecked(e.target.dataset.id, e.target.checked);
    showingEnd = false; // finish() le remet si tout est coché
    updateSky();
    renderBar();
    if (run) {
      // Le ciel suit le nombre d'étapes faites ; l'étape en cours devient la première non faite.
      const step = currentStep();
      if (step && step.id !== run.stepId) enterStep(clockNow(run), { sound: false });
      else if (!step) finish(clockNow(run));
    } else if (getProgress().complete) {
      finish(0);
    } else {
      showStart();
    }
  });

  content.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const { action } = target.dataset;
    if (action === 'close') close();
    else if (action === 'sheet') toggleSheet(true);
    else if (action === 'sheet-close') toggleSheet(false);
    else if (action === 'pref') setPref(target.dataset.key, target.dataset.key === 'jeune' ? target.dataset.value === 'true' : target.dataset.value);
    else if (action === 'sound') setPref('sound', !prefs.sound);
    else if (action === 'start') startRun(1);
    else if (action === 'preview') startRun(PREVIEW_SPEED);
    else if (action === 'stop' || action === 'end-preview') stopRun();
    else if (action === 'pause') togglePause();
    else if (action === 'reset') {
      // Confirmation dans le bouton (confirm() peut être bloqué dans l'app installée sur iPhone).
      if (!target.dataset.armed) {
        target.dataset.armed = '1';
        target.textContent = 'Toucher encore pour confirmer';
        setTimeout(() => {
          delete target.dataset.armed;
          target.textContent = '↺ Réinitialiser aujourd’hui (test)';
        }, 3000);
        return;
      }
      const history = getHistory();
      delete history[dateKey()];
      save(HISTORY_KEY, history);
      stopRun();
    }
    else if (action === 'next') {
      completeStep(run.stepId);
      enterStep(clockNow(run));
    }
  });

  const onVisible = () => {
    if (document.visibilityState === 'visible') requestWake();
  };
  document.addEventListener('visibilitychange', onVisible);

  // Au retour, l'accueil est redessiné avant que l'écran se referme : l'icône s'y recouchera.
  iconSetsOnReturn = true;

  // Ouverture : le ciel reprend directement à l'état de la progression.
  updateSky({ instant: true });
  renderBar();
  if (run) {
    const step = currentStep();
    if (!step) finish(clockNow(run));
    else {
      if (step.id !== run.stepId) enterStep(clockNow(run), { sound: false });
      showRun();
      requestWake();
    }
  } else if (getProgress().complete) {
    finish(0);
  } else {
    showStart();
  }

  return () => {
    // Fermer l'écran ne stoppe pas le déroulé : il est sauvegardé et reprend à la réouverture.
    cancelAnimationFrame(raf);
    releaseWake();
    document.removeEventListener('visibilitychange', onVisible);
    sky.destroy();
  };
}

export default {
  id: 'matin',
  title: 'Routine du matin',
  // Mise en avant (« Maintenant ») de 4 h à 11 h, tant que la routine n'est pas faite.
  isFeatured: (now) => now.getHours() >= 4 && now.getHours() < FEATURED_UNTIL_HOUR && !getProgress().complete,
  nowHint: () => {
    const { done, total } = getProgress();
    return done ? `Routine en cours · ${done}/${total}` : 'C’est l’heure de ta routine';
  },
  renderCard,
  beforeOpen: riseIcon, // le soleil de l'icône se lève avant l'ouverture
  open,
};
