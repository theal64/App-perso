import { renderSoon } from './soon.js';

export default {
  id: 'stats',
  title: 'Stats',
  icon: '▦',
  soon: true,
  open(screen, { close }) {
    renderSoon(screen, { title: 'Stats', text: 'Tes séries et ton historique, bientôt ici.', close });
  },
};
