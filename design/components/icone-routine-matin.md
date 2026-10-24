# Icône « Routine du matin » et effet au tap

Prototype interactif : `prototypes/icone-routine-matin.html` (bouton « Ralenti ×4 » pour inspecter l'effet).
Fichiers : `icone-routine-matin-active.svg`, `icone-routine-matin-inactive.svg`.
Captures image par image : `screens/icone-tap-*.png`.

## Concept
Un soleil derrière l'horizon courbe d'une planète.
- **Inactive :** le soleil est couché, seul un arc dépasse de l'horizon. Pas de rayons. Couleur `muted`.
- **Active :** le soleil est levé et plein, avec 5 rayons, l'horizon en `ice` et une étoile rouge (`ember`) en haut à droite.
- **Le tap déclenche le lever de soleil**, avec une onde de choc et des étincelles reprises des météores du fond.

## Géométrie (grille 24 × 24, trait 1,75, extrémités arrondies)
| Élément | Tracé |
|---|---|
| Horizon | `M2.5 19.5C6.5 16.4 17.5 16.4 21.5 19.5` |
| Masque du ciel (le soleil est découpé sous l'horizon) | `M0 0H24V19.5H21.5C17.5 16.4 6.5 16.4 2.5 19.5H0Z` |
| Soleil | cercle, centre (12, 11.5), rayon 3. Inactive : décalé de +5,5 en y |
| Rayons (ordre de tracé) | 0 : `M12 6.9V5.1` · 1 : `M15.25 8.25L16.5 7`, `M8.75 8.25L7.5 7` · 2 : `M16.6 11.5H18.4`, `M7.4 11.5H5.6` |
| Étoile rouge | cercle, centre (19.6, 4.4), rayon 0,8, couleur `#FF6F6A` |

Taille dans la tuile : icône de 32 pt dans une boîte de 56 × 56.

## Chronologie de l'effet (ms)
| Temps | Élément | Animation | Courbe |
|---|---|---|---|
| appui | tuile | échelle 1 → 0,96 en 90 ms, haptique léger | ease-out |
| 0–380 | tuile | échelle 0,96 → 1,025 (à 45 %) → 1 | `out` / ressort |
| 0–460 | soleil | translation y +5,5 → −0,7 (à 65 %) → 0 | `out` |
| 80–380 | soleil | remplissage transparent → `sky`, contour `muted` → `sky` | `out` |
| 0–220 | horizon | couleur `muted` → `ice` | `out` |
| 180 + ordre × 45, sur 260 | rayons | tracé du trait de 0 → 100 %, opacité 0 → 1 | `out` |
| 380–680 | étoile rouge | échelle 0 → 1,6 (à 55 %) → 1, opacité 0 → 1 | `out` |
| 60–760 | halo derrière la boîte | opacité 0 → 0,95 (à 30 %) → 0, échelle 0,6 → 1,25 | ease-out |
| 120–740 | onde rouge | cercle de rayon 34 pt, échelle 0,12 → 1, opacité 0,8 → 0, trait de 1,2 | `burst` |
| 150–730 | onde glace | cercle de rayon 32 pt, échelle 0,12 → 0,92, opacité 0,7 → 0, trait de 0,9 | `burst` |
| 140 + i × 12, sur 520 | 7 étincelles | angles −150, −118, −90, −62, −30, −172, −8° ; trait de 4 pt ; distance 6 → 12 (à 25 %) → 22 à 32 pt ; les n° 1 et 4 sont rouges | `burst` |
| 0–220 | titre de la tuile | `muted` → `ice` | `out` |
| 200–560 | chevron | x 0 → +4 → 0 | `out` |
| 560 | navigation | transition vers l'écran Routine (sortie 220 + entrée 380) | |

**Au retour sur l'accueil**, le soleil se recouche : y 0 → +5,5 en 360 ms (courbe `in`), les rayons se rétractent (180 ms, du bord vers le centre), l'étoile s'éteint.

**Mouvement réduit** : fondu de l'icône de 200 ms, passage direct à l'état actif, pas d'onde ni d'étincelles.

## Notes de portage
- **Web (React, PWA)** : reprendre le prototype tel quel (Web Animations API, SVG avec `pathLength="1"` pour le tracé des rayons).
- **SwiftUI** : soleil = `Circle` décalé avec `.offset(y:)` à l'intérieur d'un `.mask` qui suit la forme de l'horizon. Rayons = `Path` avec `.trim(from: 0, to: progression)`. Ondes = `Circle().stroke()` animé en `.scaleEffect` et `.opacity`. Étincelles = `Capsule` dans un `ForEach`, ou `TimelineView` + `Canvas`. Dépassement d'échelle = `.spring(response: 0.35, dampingFraction: 0.62)`. Enchaînement = `withAnimation(...).delay(...)` ou `PhaseAnimator` / `keyframeAnimator` (iOS 17+).
- **Validation** : comparer avec `screens/icone-tap-*.png`, à 0, 100, 200, 300, 420, 560 et 800 ms.
