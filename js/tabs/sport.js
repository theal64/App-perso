import { renderSoon } from './soon.js';
import { ICONS } from '../icons.js';

export default {
  id: 'sport',
  title: 'Séance de sport',
  subtitle: 'À venir',
  icon: ICONS.dumbbell,
  soon: true,
  // Mise en avant (« Maintenant ») l'après-midi, avant la séance.
  isFeatured: (now) => now.getHours() >= 12 && now.getHours() < 20,
  nowHint: () => 'Ta séance arrive bientôt ici',
  open(screen, { close }) {
    renderSoon(screen, { title: 'Séance de sport', text: 'Ta séance guidée arrive bientôt.', close });
  },
};
