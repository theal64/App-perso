import { renderSoon } from './soon.js';

export default {
  id: 'stats',
  label: 'Stats',
  icon: '▦',
  soon: true,
  render(container) {
    renderSoon(container, 'Stats', 'Cet onglet arrive bientôt.');
  },
};
