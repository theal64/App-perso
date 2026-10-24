// Petit carillon en Web Audio. unlockAudio() doit être appelé sur un geste (toucher).

let actx = null;

export function unlockAudio() {
  if (!actx) {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return;
    }
  }
  if (actx.state === 'suspended') actx.resume();
}

export function chime(f1 = 660, f2 = 990) {
  if (!actx) return;
  const t = actx.currentTime;
  [f1, f2].forEach((f, i) => {
    const o = actx.createOscillator();
    const g = actx.createGain();
    const at = t + i * 0.12;
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
    o.connect(g).connect(actx.destination);
    o.start(at);
    o.stop(at + 1.5);
  });
}
