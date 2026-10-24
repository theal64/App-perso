import { renderSoon } from './soon.js';
import { ICONS } from '../icons.js';

export default {
  id: 'stats',
  title: 'Stats',
  subtitle: 'Séries · historique',
  icon: ICONS.bars,
  soon: true,
  open(screen, { close }) {
    renderSoon(screen, { title: 'Stats', text: 'Tes séries et ton historique, bientôt ici.', close });
  },
};
