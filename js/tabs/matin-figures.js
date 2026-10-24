// Silhouettes animées des sous-étapes (qi gong et exos), en SVG.
// Les mouvements sont en CSS (voir .fig-* dans style.css). Les figures dont le
// rythme suit un texte (Gauche / Droite, Inspire / Expire) ont une période fixe,
// recalée sur l'horloge via la variable --sync.

const ground = (x1, x2, y) => `<path class="ground" d="M${x1} ${y} H${x2}"/>`;

// De face : tête, tronc, bras, jambes.
const front = (cls) => `
  <svg viewBox="0 0 100 120" class="fig ${cls}" aria-hidden="true">
    <g class="body">
      <g class="upper">
        <circle cx="50" cy="20" r="8"/>
        <path d="M50 29 V64"/>
        <path class="arm-l" d="M50 35 L37 61"/>
        <path class="arm-r" d="M50 35 L63 61"/>
      </g>
      <path d="M50 64 L42 108 M50 64 L58 108"/>
    </g>
    ${ground(26, 74, 112)}
  </svg>`;

export const FIGURES = {
  // Sautillements : petits rebonds, bras qui ballottent.
  bounce: front('fig-bounce'),

  // Rotations : le haut du corps tourne, les bras ballants suivent (période 2,4 s).
  swing: front('fig-swing'),

  // Paumes vers le ciel en inspirant, puis on se penche en expirant (période 8 s). De profil.
  stretch: `
    <svg viewBox="0 0 100 120" class="fig fig-stretch" aria-hidden="true">
      <path d="M50 64 L48 108 M50 64 L54 108"/>
      <g class="upper">
        <circle cx="50" cy="20" r="8"/>
        <path d="M50 29 V64"/>
        <path class="arms" d="M50 35 L50 62"/>
      </g>
      ${ground(26, 74, 112)}
    </svg>`,

  // Pompes : le corps descend et remonte, de profil.
  pushup: `
    <svg viewBox="0 0 120 90" class="fig fig-pushup" aria-hidden="true">
      <g class="body">
        <path d="M18 78 L55 70 L88 62"/>
        <circle cx="99" cy="56" r="7"/>
      </g>
      <path class="arm" d="M88 80 L88 62"/>
      ${ground(8, 112, 82)}
    </svg>`,

  // Planche lean : épaules en avant des mains, on bascule doucement vers l'avant.
  lean: `
    <svg viewBox="0 0 120 90" class="fig fig-lean" aria-hidden="true">
      <g class="body">
        <path d="M16 74 L52 68 L88 60"/>
        <circle cx="99" cy="54" r="7"/>
      </g>
      <path class="arm" d="M78 80 L88 60"/>
      ${ground(8, 112, 82)}
    </svg>`,

  // Combo ou hold : un équilibre sur les mains qui oscille légèrement.
  hold: `
    <svg viewBox="0 0 120 90" class="fig fig-hold" aria-hidden="true">
      <g class="body">
        <path d="M52 80 L58 58 M68 80 L62 58"/>
        <circle cx="60" cy="67" r="6"/>
        <path d="M60 58 V30"/>
        <path d="M60 30 L56 6 M60 30 L64 6"/>
      </g>
      ${ground(30, 90, 82)}
    </svg>`,
};

// Période (s) des figures recalées sur un texte rythmé.
export const FIGURE_PERIOD = { swing: 2.4, stretch: 8 };
