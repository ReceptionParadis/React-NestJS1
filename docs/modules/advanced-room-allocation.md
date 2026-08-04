# Advanced Room Allocation

## Nouveaux attributs chambre

- `accessible` : chambre adaptée PMR.
- `connectingGroup` : identifiant commun aux chambres communicantes.
- `preferredForGroups` : chambre à privilégier pour les groupes.

## Nouveaux attributs rooming list

- `requiresAccessible` : besoin PMR obligatoire.
- `connectingRequest` : voyageurs devant être placés dans le même ensemble communicant.
- `preferredFloor` : étage préféré.
- `preferredBuilding` : bâtiment préféré.

## Règles de scoring

1. Les besoins PMR sont traités en premier et filtrent les chambres non accessibles.
2. Les demandes communicantes sont regroupées sur le même `connectingGroup`.
3. Le bâtiment et l’étage préférés augmentent le score sans bloquer l’allocation.
4. Les chambres PMR sont pénalisées lorsqu’elles ne sont pas nécessaires afin de préserver le stock.
5. Les chambres contrôlées et privilégiées pour les groupes reçoivent un bonus.
6. Les validations manuelles sont recontrôlées côté API avant écriture.

## Migration locale

```bash
pnpm db:generate
pnpm db:migrate
pnpm build
```

La migration doit ajouter les nouveaux champs avec leurs valeurs par défaut avant d’activer le moteur en production.
