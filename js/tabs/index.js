// Registre des sections de l'accueil, dans l'ordre d'affichage.
//
// Une section est un objet exporté par js/tabs/<nom>.js :
//   id, title, subtitle?, icon, soon?   identité et bouton par défaut
//   isFeatured?(now) → bool             mise en avant « Maintenant » à cette heure-ci ?
//   nowHint?(now) → texte               ligne affichée sous l'horloge quand elle est mise en avant
//   renderCard?(el)                     contenu du bouton (sinon bouton par défaut)
//   beforeOpen?(tile) → Promise         animation du bouton touché, avant l'ouverture
//   open(screen, { close })             remplit l'écran plein ; peut renvoyer une fonction de nettoyage
//
// Pour ajouter une section : créer le fichier, l'importer ici, et l'ajouter à ASSETS dans sw.js.
// soir.js, journee.js et stats.js existent toujours : ils sont retirés de l'accueil pour l'instant.

import matin from './matin.js';
import sport from './sport.js';

export const sections = [matin, sport];
