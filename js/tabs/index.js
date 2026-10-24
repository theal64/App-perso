// Registre des sections de l'accueil, dans l'ordre d'affichage.
//
// Une section est un objet exporté par js/tabs/<nom>.js :
//   id, title, icon, soon?        identité et petite carte par défaut
//   isFeatured?(now) → bool       veut-elle la grande carte vedette maintenant ?
//   renderFeatured?(el)           contenu de la carte vedette
//   renderCard?(el)               contenu de la petite carte (sinon carte par défaut)
//   beforeOpen?(tile) → Promise   animation de la carte touchée, avant l'ouverture
//   open(screen, { close })       remplit l'écran plein ; peut renvoyer une fonction de nettoyage
//
// La première section dont isFeatured(now) est vrai prend la carte vedette :
// pour qu'une autre section la prenne selon l'heure, il suffit de lui donner un isFeatured.
// Pour ajouter une section : créer le fichier, l'importer ici, et l'ajouter à ASSETS dans sw.js.

import matin from './matin.js';
import soir from './soir.js';
import journee from './journee.js';
import stats from './stats.js';

export const sections = [matin, soir, journee, stats];
