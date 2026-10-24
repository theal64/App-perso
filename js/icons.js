// Icônes SVG de l'interface (trait 1.75 sur une grille 24, comme les prototypes de design/).

export const CHEVRON = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

const plain = (paths) => `<svg class="plain" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
  moon: plain('<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'),
  sun: plain('<circle cx="12" cy="12" r="3.5"/><path d="M12 4v1.8M12 18.2V20M4 12h1.8M18.2 12H20M6.3 6.3l1.3 1.3M16.4 16.4l1.3 1.3M6.3 17.7l1.3-1.3M16.4 7.6l1.3-1.3"/>'),
  bars: plain('<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>'),
  dumbbell: plain('<path d="M6.5 7.5v9M3.5 9.5v5M17.5 7.5v9M20.5 9.5v5M6.5 12h11"/>'),
};
