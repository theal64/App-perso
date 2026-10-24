import { renderSoon } from './soon.js';

export default {
  id: 'soir',
  label: 'Soir',
  icon: '☾',
  soon: true,
  render(container) {
    renderSoon(container, 'Soir', 'Cet onglet arrive bientôt.');
  },
};
