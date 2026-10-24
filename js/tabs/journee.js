import { renderSoon } from './soon.js';

export default {
  id: 'journee',
  title: 'Journée',
  icon: '☀︎',
  soon: true,
  open(screen, { close }) {
    renderSoon(screen, { title: 'Journée', text: 'Cette section arrive bientôt.', close });
  },
};
