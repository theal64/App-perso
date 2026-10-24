// Registre des onglets, dans l'ordre de la barre du bas.
// Pour ajouter un onglet : créer js/tabs/<nom>.js qui exporte un objet
// { id, label, icon, soon?, render(container) }, l'importer ici,
// et l'ajouter à ASSETS dans sw.js.

import matin from './matin.js';
import journee from './journee.js';
import soir from './soir.js';
import stats from './stats.js';

export const tabs = [matin, journee, soir, stats];
