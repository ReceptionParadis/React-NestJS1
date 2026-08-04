# Revue d’allocation des chambres

## Route

`/groupes/allocation?groupId=<id>&name=<nom>`

## Fonctionnement

1. L’écran appelle `POST /api/allocation/:groupId/propose`.
2. Le moteur retourne les affectations, leur score, les raisons et les conflits.
3. L’utilisateur peut remplacer manuellement une chambre sans créer de double attribution.
4. La validation envoie les choix vers `POST /api/allocation/:groupId/apply`.
5. L’application met à jour la rooming list et les chambres dans une transaction Prisma.

## Contrôles visibles

- type de chambre demandé ;
- capacité ;
- bâtiment et étage ;
- score de compatibilité ;
- raisons du choix ;
- demandes spéciales ;
- conflits sans solution automatique.

## Mode démonstration

Lorsque l’API n’est pas disponible, l’écran affiche un jeu de données local afin de permettre une revue immédiate de l’ergonomie.

## Suite prévue

- champs Prisma explicites `accessible` et `connectingGroup` ;
- regroupement des couples et occupants d’une même chambre ;
- préférences d’étage ;
- glisser-déposer ;
- tests unitaires du scoring et des conflits.
