import { renderSoon } from './soon.js';

export default {
  id: 'soir',
  title: 'Bilan du soir',
  icon: '☾',
  soon: true,
  open(screen, { close }) {
    renderSoon(screen, { title: 'Bilan du soir', text: 'Un petit bilan pour clore la journée.', close });
  },
};
