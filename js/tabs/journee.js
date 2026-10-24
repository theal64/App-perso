import { renderSoon } from './soon.js';
import { ICONS } from '../icons.js';

export default {
  id: 'journee',
  title: 'Journée',
  subtitle: 'À venir',
  icon: ICONS.sun,
  soon: true,
  open(screen, { close }) {
    renderSoon(screen, { title: 'Journée', text: 'Cette section arrive bientôt.', close });
  },
};
