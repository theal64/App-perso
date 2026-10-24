// Plan minuté de la routine du matin : durées, sous-étapes du qi gong,
// type de jour (poste / off), jeûne et heure de départ.

import { load, save } from '../storage.js';

const PREFS_KEY = 'matin:prefs';
const DEPART_HOUR = 7; // jour de poste : départ à 7h00
export const PREVIEW_SPEED = 20;

export function getPrefs() {
  return { mode: 'poste', jeune: false, sound: true, ...load(PREFS_KEY, {}) };
}

export function savePrefs(prefs) {
  save(PREFS_KEY, prefs);
}

// Les ids doivent rester stables : ils servent de clé dans l'historique.
export function buildPlan(prefs = getPrefs()) {
  return [
    { id: 'lit', label: 'Lit + aérer', dur: 60, cue: 'Fais le lit, ouvre la fenêtre.' },
    { id: 'eau', label: 'Eau + se débarbouiller', dur: 60, cue: 'Un grand verre. Eau froide sur le visage.' },
    // fig : silhouette animée affichée dans l'anneau (voir matin-figures.js).
    {
      id: 'qigong', label: 'Qi gong', dur: 90,
      subs: [
        { t: 30, name: 'Sautillements', cue: 'Sautille sur place. Épaules et bras relâchés.', fig: 'bounce' },
        { t: 30, name: 'Rotations', cue: 'swing', fig: 'swing' },
        { t: 30, name: 'Paumes au ciel', cue: 'breath', fig: 'stretch' },
      ],
    },
    {
      id: 'exos', label: 'Exos courts', dur: 180,
      subs: [
        { t: 60, name: '15 pompes', cue: '15 pompes propres, à ton rythme.', fig: 'pushup' },
        { t: 45, name: 'Planche lean', cue: 'Bras tendus, épaules en avant des mains. Gaine.', fig: 'lean' },
        { t: 75, name: 'Combo ou hold', cue: 'Une tentative de combo ou de hold. Qualité avant tout.', fig: 'hold' },
      ],
    },
    prefs.jeune
      ? { id: 'cafe', label: 'Café', dur: 420, cue: 'Jour de jeûne : café seul, tranquille.' }
      : { id: 'cafe', label: 'Café et petit-déj', dur: 600, cue: 'Les deux en même temps.' },
    { id: 'dents', label: 'Dents + habillage', dur: 300, cue: 'La tenue t’attend depuis hier soir.' },
    { id: 'balade', label: 'Balade 20 min avec Teiki', dur: 1200, cue: 'Le téléphone reste ici.', adaptive: true },
  ];
}

// ---------- Temps ----------

export const fmtHM = (d) => `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;

export function fmtCD(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function departFor(ms) {
  const d = new Date(ms);
  d.setHours(DEPART_HOUR, 0, 0, 0);
  return d.getTime();
}

// Jour de poste : la balade se raccourcit (10 min minimum) pour partir à 7h00.
function baladeFor(prefs, startMs) {
  if (prefs.mode !== 'poste') return 1200;
  const left = (departFor(startMs) - startMs) / 1000;
  return Math.max(600, Math.min(1200, Math.round(left - 180)));
}

// Durée (s) d'une étape qui commence à startMs.
export const stepDur = (step, prefs, startMs) => (step.adaptive ? baladeFor(prefs, startMs) : step.dur);

export function stepCue(step, prefs, startMs, dur) {
  if (!step.adaptive || prefs.mode !== 'poste' || dur >= 1200) return step.cue;
  const left = Math.round((departFor(startMs) - startMs) / 60000);
  return left - 3 < 10
    ? `Retard : balade minimum 10 min, départ vers ${fmtHM(new Date(startMs + 600000))}.`
    : `Balade raccourcie à ${Math.round(dur / 60)} min pour partir à 7h00.`;
}

// Heure simulée de début de l'aperçu accéléré.
export function previewStart(prefs) {
  const d = new Date();
  prefs.mode === 'poste' ? d.setHours(6, 5, 0, 0) : d.setHours(8, 30, 0, 0);
  return d.getTime();
}

export function planText(prefs, steps) {
  const total = Math.round(steps.reduce((a, s) => a + s.dur, 0) / 60);
  const head = `${steps.length} étape${steps.length > 1 ? 's' : ''} · <b>${total} min</b>`;
  if (prefs.mode !== 'poste') return `${head} · réveil au plus tard 9h00, pas d’heure de départ.`;
  const end = new Date();
  end.setHours(6, 5 + total, 0, 0);
  const marge = Math.round((departFor(end.getTime()) - end.getTime()) / 60000);
  return `${head} · levé 6h05, départ prévu <b>${fmtHM(end)}</b>, marge <b>${marge} min</b> avant 7h00.`;
}
