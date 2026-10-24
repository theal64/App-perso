// Effet "carte qui s'ouvre" façon App Store : l'écran plein est révélé
// depuis le rectangle de la carte (clip-path), puis s'y referme.

const EASE = 'cubic-bezier(.32,.72,0,1)';
const OPEN_MS = 560;
const CLOSE_MS = 460;
const FULL = 'inset(0px 0px 0px 0px round 0px)';
const RADIUS = 24;

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function clipFor(rect) {
  const right = innerWidth - rect.right;
  const bottom = innerHeight - rect.bottom;
  return `inset(${rect.top}px ${right}px ${bottom}px ${rect.left}px round ${RADIUS}px)`;
}

export async function openCard(tile, screen, home) {
  screen.hidden = false;
  document.documentElement.classList.add('screen-open');

  if (!tile || reduceMotion()) {
    await screen.animate({ opacity: [0, 1] }, { duration: 220, easing: 'ease-out' }).finished;
    return;
  }

  const from = clipFor(tile.getBoundingClientRect());
  tile.style.visibility = 'hidden';
  screen.querySelector('.screen-content')?.animate(
    { opacity: [0, 1] },
    { duration: 300, delay: OPEN_MS * 0.5, easing: 'ease-out', fill: 'backwards' }
  );
  home.animate(
    { transform: ['none', 'scale(.93)'], opacity: [1, 0.5] },
    { duration: OPEN_MS, easing: EASE, fill: 'forwards' }
  );
  await screen.animate({ clipPath: [from, FULL] }, { duration: OPEN_MS, easing: EASE }).finished;
  tile.style.visibility = '';
}

export async function closeCard(tile, screen, home) {
  // On annule le recul de l'accueil pour mesurer la carte à sa vraie place.
  home.getAnimations().forEach((a) => a.cancel());

  if (!tile || reduceMotion()) {
    await screen.animate({ opacity: [1, 0] }, { duration: 200, easing: 'ease-in', fill: 'forwards' }).finished;
  } else {
    const to = clipFor(tile.getBoundingClientRect());
    tile.style.visibility = 'hidden';
    screen.querySelector('.screen-content')?.animate(
      { opacity: [1, 0] },
      { duration: 180, easing: 'ease-in', fill: 'forwards' }
    );
    home.animate({ transform: ['scale(.93)', 'none'], opacity: [0.5, 1] }, { duration: CLOSE_MS, easing: EASE });
    await screen.animate({ clipPath: [FULL, to] }, { duration: CLOSE_MS, easing: EASE, fill: 'forwards' }).finished;
  }

  screen.hidden = true;
  screen.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  document.documentElement.classList.remove('screen-open');
  if (tile) tile.style.visibility = '';
}
