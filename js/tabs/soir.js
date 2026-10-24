import { renderSoon } from './soon.js';
import { ICONS } from '../icons.js';

export default {
  id: 'soir',
  title: 'Bilan du soir',
  subtitle: '21h · 3 questions',
  icon: ICONS.moon,
  soon: true,
  open(screen, { close }) {
    renderSoon(screen, { title: 'Bilan du soir', text: 'Un petit bilan pour clore la journée.', close });
  },
};
