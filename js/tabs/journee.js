import { renderSoon } from './soon.js';

export default {
  id: 'journee',
  label: 'Journée',
  icon: '☀︎',
  soon: true,
  render(container) {
    renderSoon(container, 'Journée', 'Cet onglet arrive bientôt.');
  },
};
