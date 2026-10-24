# DESIGN.md — App perso de Théo

Source de vérité visuelle de l'app. **À lire avant tout travail d'interface.**
Les prototypes HTML de `prototypes/` font foi : en cas de doute entre ce document et un prototype, le prototype gagne.

---

## 1. Direction

- **Univers :** ciel de fin du monde qui devient une aube. Au réveil, le ciel est noir et l'horizon rouge sang. Plus la routine avance, plus le ciel bleuit et l'horizon tourne à l'or. Le message : tu traverses la nuit, le jour se lève.
- **Ton :** sobre, dense et premium. Il y a une seule chose spectaculaire par écran (le fond, ou un effet au tap), et tout le reste reste calme.
- **Thème :** sombre uniquement. Pas de mode clair.
- **Signature :** des micro-reflets rouges (`ember`) dans un monde bleu. Une étoile rouge, un liseré rouge sur une onde de choc. Toujours en petite dose, jamais en aplat.

## 2. Couleurs (tokens)

| Token | Hex | Usage |
|---|---|---|
| `night` | `#040B22` | Fond de base |
| `deep` | `#0B2560` | Fond secondaire, ciel en milieu de routine |
| `sky` | `#8FCAFF` | Accent principal, progression, éléments actifs |
| `ice` | `#EAF4FF` | Texte principal, bouton primaire (fond) |
| `muted` | `#A9BFE0` | Texte secondaire, icônes inactives |
| `line` | `rgba(234,244,255,.14)` | Bordures, pistes, séparateurs |
| `glass` | `rgba(6,16,44,.42–.5)` | Surfaces en verre (avec flou d'arrière-plan de 10–12 px) |
| `ember` | `#FF6F6A` | Micro-reflets rouges (petites touches uniquement) |
| `warn` | `#FFC56B` | Marge de départ entre 0 et 10 min |
| `late` | `#FF8F80` | Retard |

Horizon (fond) : il part de `#FF3A2E` (rouge sang, au réveil) et va vers `#FFC27A` (or, au départ), en interpolation linéaire selon l'avancement.

## 3. Typographie

| Rôle | Police | Graisses | Usage |
|---|---|---|---|
| Affichage | **Bricolage Grotesque** (Google Fonts, licence OFL) | 600, 800 | Titres, noms d'étape, chiffres héros |
| Utilitaire | **IBM Plex Mono** (Google Fonts, licence OFL) | 400, 500 | Heures, compteurs, libellés, boutons secondaires |
| Repli système | SF Pro / system-ui | | Uniquement si les polices ne chargent pas |

Échelle : titres 40–64 pt, interlettrage −3,5 %, interligne 0,95. Noms d'étape 36–64 pt. Corps 15–24 pt. Libellés 11–13 pt en mono, en majuscules, interlettrage +14 à 16 %. Les chiffres alignés sont toujours en chasse fixe (`tabular-nums`).

Pour une app native iOS, il faut embarquer les fichiers TTF des deux polices (licence OFL, intégration autorisée).

## 4. Formes et espacements

- **Rayons :** tuiles et cartes 18–22, boîte d'icône 17, boutons pilule 999, gros bouton d'action 22.
- **Marge latérale :** au moins 16, plus la zone sûre de l'appareil.
- **Espacement :** base de 2, avec les valeurs 6, 8, 10, 12, 14, 16, 18, 22, 26.
- Les surfaces en verre ont une bordure de 1 px en `line`, sans ombre portée. La profondeur vient du flou d'arrière-plan.
- **Bouton primaire :** fond `ice`, texte `night`, graisse 800, avec un reflet qui traverse en boucle (cycle de 3,6 s).

## 5. Mouvement

### Principes
1. **Un seul moment fort à la fois.** Si le fond est en train de faire un effet, l'interface reste sobre.
2. **Le rythme suit le corps.** Les rythmes physiques (respiration 4 s, balancement 1,2 s) tournent en temps réel, même en mode accéléré.
3. **Rien de bloquant.** Une animation ne retarde jamais une action de plus de 600 ms.
4. **Mouvement réduit** (réglage système) : les effets deviennent de simples fondus de 150 à 200 ms, et le fond est quasi figé (vitesse × 0,15, sans comètes ni éclairs).

### Courbes
| Nom | Valeur | Usage |
|---|---|---|
| `out` | `cubic-bezier(.2,.75,.2,1)` | Entrées, changements d'état (courbe par défaut) |
| `burst` | `cubic-bezier(.1,.6,.3,1)` | Ondes de choc, étincelles |
| `in` | `cubic-bezier(.5,0,.75,0)` | Sorties, coucher de soleil |
| Ressort (SwiftUI) | `spring(response: 0.35, dampingFraction: 0.62)` | Équivalent natif du dépassement d'échelle |

### Durées
| Type | Durée |
|---|---|
| Appui (pression) | 90 ms |
| Changement d'état d'une icône | 300–460 ms |
| Transition d'écran | sortie 220 ms + entrée 380 ms (glissement de 24 px vers le haut et fondu) |
| Texte cinétique | 750 ms par lettre, décalage de 32 ms entre lettres (montée de 0,55 em, rotation de 6°, flou de 10 px → net) |
| Changement d'étape | sortie 350 ms, puis entrée 350 ms |

### Retour haptique (iOS)
- Appui sur une tuile : `UIImpactFeedbackGenerator(style: .light)`.
- Fin de routine : `UINotificationFeedbackGenerator().notificationOccurred(.success)`.

## 6. Fond animé « fin du monde » (référence : `prototypes/mode-matin.html`, phases : § 6.1)

Le fond est composé de couches, de l'arrière vers l'avant :

1. **Nébuleuse (shader WebGL)**, rendue à 45–60 % de la résolution. Bruit fractal (fbm, 5 octaves) déformé deux fois, en bleu `#17338C`, violet `#541C7A` et rouge sang `#9E0D17`. Dérive temporelle × 0,022, bandes de poussière sombre, grain de 3 %, assombrissement des bords.
2. **Étoiles de champ** : 520 à 1 100, qui tournent autour d'un pôle situé au-dessus de l'écran (0,0045 rad/s). 5 % sont rouges.
3. **Constellations** : 8 à 14 groupes de 4 à 7 étoiles, reliées au plus proche voisin. Cycle de 16 à 28 s : tracé (18 %), tenue, effacement.
4. **Météores** : un toutes les 0,9 à 3,5 s, avec une traîne rouge-orange et un liseré bleu. Un gros toutes les 16 à 30 s : explosion, flash, onde de choc rouge et glace, 70 étincelles, secousse de 5 px.
5. **Éclairs** : toutes les 5 à 14 s, un éclair ramifié violet et blanc qui illumine localement la nébuleuse.
6. **Planète éclipsée** : rayon égal à 62 % de la plus grande dimension de l'écran, centre à 78 % du rayon sous le bas de l'écran. Bord lumineux de la couleur d'horizon, liseré bleu intérieur, rayons de lumière qui ondulent.
7. **Braises** : 150, qui montent du sol avec un balancement et un scintillement.

**Lien avec les étapes :** secouement → le ciel vibre · rotations → il oscille · respiration → la couronne respire · exos → elle pulse chaque seconde · café → les braises montent plus vite · dents + habillage → la pluie de météores reprend · balade → elle s'intensifie (puis l'aube la raréfie) · départ → éclat de lumière au sommet de la planète, ciel en aube.

### 6.1 Récit en 4 phases (de la nuit endormie au renouveau)

Le fond est piloté par deux paramètres continus, calculés à partir de l'avancement réel de la routine :

- **`awake`** : 0 = nuit endormie, 1 = fin du monde complète.
- **`dawn`** : 0 = nuit, 1 = aube.

Chaque changement est lissé par une interpolation exponentielle (constante de temps 0,85 s, soit environ 4 s pour aller au bout). Il n'y a aucun saut visible, même en appuyant sur « Fait → ». Implémentation : `js/endsky.js` (moteur), `skyPhase()` dans `js/tabs/matin.js` (table ci-dessous).

| Phase | Moment | `awake` | `dawn` |
|---|---|---|---|
| 1 · Nuit endormie | Écran de départ, étapes 1 « Lit + aérer » et 2 « Eau + visage » | 0 | 0 |
| 2 · Éveil | Étape 3 « Qi gong » | 0 → 1 selon l'avancement du qi gong | 0 |
| 3 · Fin du monde | Étapes 4 « Exos », 5 « Café », 6 « Dents + habillage » | 1 | 0 → 0,4 sur les trois étapes |
| 4 · Aube | Étape 7 « Balade » | 1 | 0,4 → 0,85 |
| 4 · Renouveau | Écran « Départ » | 1 | 1, avec l'éclat au sommet de la planète |

**Phase 1 · Nuit endormie.**
- Fond quasi noir neutre `#05060A`, avec 1 500 à 2 500 étoiles selon la surface de l'écran. Elles sont blanches ou gris-bleu très désaturées, de 0,3 à 1,6 px, et 3 % sont plus brillantes.
- Voie lactée diffuse en bande diagonale, du haut-gauche vers le bas-centre : 38 % des étoiles s'y concentrent, sous un voile laiteux dont le cumul reste sous 8 % d'opacité.
- Rotation du ciel de 0,0015 rad/s et scintillement lent, avec une période de 3 à 8 s.
- Une étoile filante fine et blanche toutes les 25 à 40 s, sans explosion.
- Pas de nébuleuse, de planète, de constellations, de braises ni d'éclairs.

**Phase 2 · Éveil.**
- La nébuleuse apparaît en fondu (opacité du shader = `awake`).
- La planète monte depuis sous l'écran jusqu'à sa position du prototype (translation pilotée par `awake`, courbe ease-out), avec son liseré rouge.
- Les constellations se tracent une à une : chacune apparaît à son seuil d'éveil.
- Les braises montent du bas (nombre × `awake`).
- Les météores sont d'abord rares, puis de plus en plus fréquents. Les gros météores et les éclairs n'arrivent qu'au-delà de `awake` 0,7.
- Les étoiles de la phase 1 prennent progressivement les couleurs du prototype (5 % de rouges), et la rotation passe à 0,0045 rad/s.

**Phase 3 · Fin du monde.** C'est le rendu exact du prototype : couches 1 à 7 ci-dessus et liens avec les étapes.

**Phase 4 · Aube et renouveau.**
- Le ciel bleuit et l'horizon passe du rouge à l'or.
- Les météores et les éclairs se raréfient, puis s'arrêtent au-delà de `dawn` 0,85.
- Les braises s'éteignent.
- Les constellations restent tracées et s'adoucissent.
- Sur l'écran Départ apparaît l'éclat de lumière au sommet de la planète.

**Mouvement réduit.** Le fond est quasi figé (vitesse × 0,15, scintillement coupé), sans météores ni éclairs. Les phases s'enchaînent par simple fondu.

**Performance.** Le shader est rendu à 45 % de la résolution sur les grands écrans et à 60 % ailleurs. Les étoiles sont regroupées par couleur et par opacité pour être dessinées en peu d'appels. Le nombre d'étoiles est adapté à la surface de l'écran.

**Mise en œuvre native (SwiftUI) :** intégrer le fond (`js/endsky.js`) dans une `WKWebView` transparente, placée derrière l'interface, et exposer `setSky(awake, dawn, step)` appelée depuis Swift via `evaluateJavaScript`. Ne pas réécrire le fond en Metal pour une app perso : le gain ne justifie pas le coût.

## 7. Composants

| Composant | Spec | Prototype |
|---|---|---|
| Icône « Routine du matin » et effet au tap | `components/icone-routine-matin.md` | `prototypes/icone-routine-matin.html` |
| Tuile de menu | Verre, rayon 22, boîte d'icône 56 × 56 (rayon 17), titre 20/700, sous-titre en mono 12, chevron | idem |
| Anneau de minuteur | Piste 2 px en `line`, progression 4 px en `sky` avec halo, 60 graduations | `prototypes/mode-matin.html` |
| Badge de départ | Pilule en mono 12. Marge ≥ 10 min en `sky`, entre 0 et 10 min en `warn`, retard en `late` | idem |
| Compteur (carte chiffrée) | Carte en verre, chiffre 30/800, libellé en mono | idem |

## 8. À éviter

- Les dégradés violet-bleu génériques, le crème et terracotta, le vert acide.
- Inter, Roboto ou Space Grotesk comme police principale.
- Les emojis comme icônes.
- Le même rayon et la même ombre sur tous les blocs.
- Le rouge en aplat ou en grande surface : il est réservé aux reflets.
- Plusieurs effets spectaculaires en même temps sur un même écran.
- Les animations de plus de 600 ms qui bloquent une action.
