# design/

Dossier de transmission entre les prototypes visuels (faits avec Claude, dans le chat) et l'app (codée avec Claude Code).

## Comment s'en servir

1. **Avant tout travail d'interface**, lire `DESIGN.md` (couleurs, polices, mouvement, règles, ce qu'il faut éviter).
2. **Pour un composant**, lire sa fiche dans `components/` et ouvrir son prototype dans `prototypes/`. Le prototype est la référence exacte : on reprend ses valeurs (durées, courbes, tracés), on ne les réinvente pas.
3. **Après chaque modification d'interface**, faire une capture de l'écran réel et la comparer aux captures de `screens/`. Corriger les écarts visibles avant de dire que c'est terminé.

## Contenu

| Chemin | Rôle |
|---|---|
| `DESIGN.md` | Système visuel complet |
| `components/icone-routine-matin.md` | Fiche de l'icône du menu et de son effet au tap (chronologie à la milliseconde) |
| `components/*.svg` | Icônes prêtes à l'emploi (états actif et inactif) |
| `prototypes/mode-matin.html` | Prototype complet de la routine du matin avec le fond animé (WebGL et canvas) |
| `prototypes/icone-routine-matin.html` | Banc de test de l'icône : menu fictif, ralenti ×4, navigation |
| `screens/` | Captures de référence (écrans et images de l'animation) |

## Workflow

- Les nouveaux visuels sont prototypés avec Claude, puis ajoutés ici : un prototype, une fiche dans `components/` et des captures dans `screens/`.
- Claude Code les intègre dans l'app en suivant la fiche.
- Ce dossier est mis à jour à chaque nouvel élément. Un élément qui n'est pas dans ce dossier n'a pas de design validé.
