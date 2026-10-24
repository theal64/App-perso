<!-- À coller dans le CLAUDE.md à la racine du dépôt App-perso -->

## Design

- Avant tout travail d'interface, lis `design/README.md` puis `design/DESIGN.md`.
- Pour un composant, suis sa fiche dans `design/components/` et prends son prototype dans `design/prototypes/` comme référence exacte : reprends les durées, les courbes, les tracés et les couleurs, ne les réinvente pas.
- N'introduis aucune couleur, police ou durée d'animation absente de `DESIGN.md` sans le signaler.
- Après une modification d'interface, fais une capture de l'écran (simulateur iOS : `xcrun simctl io booted screenshot /tmp/capture.png` ; web : Playwright), regarde-la et compare-la à `design/screens/`. Corrige les écarts visibles avant de conclure.
- Respecte le réglage « Réduire les animations » : fondus simples, pas d'effets.
