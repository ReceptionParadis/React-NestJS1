# Smart Room Allocation

## Objectif

Proposer automatiquement une chambre compatible à chaque ligne de rooming list, puis appliquer l’attribution de manière atomique.

## Endpoints

### Générer une proposition

`POST /api/allocation/:groupId/propose`

La réponse contient :

- `proposals` : voyageurs attribuables, chambre proposée, score et raisons ;
- `conflicts` : voyageurs sans chambre compatible ;
- `summary` : total, attribués et conflits.

### Appliquer une proposition

`POST /api/allocation/:groupId/apply`

```json
{
  "assignments": [
    { "entryId": "rooming-entry-id", "roomId": "room-id" }
  ]
}
```

## Règles actuellement appliquées

- exclusion des chambres hors service ;
- exclusion des chambres occupées sur les dates du groupe ;
- priorité au type de chambre exact ;
- respect de la capacité minimale ;
- distinction stricte entre `DOUBLE` et `TWIN` ;
- priorité à une chambre explicitement demandée ;
- bonus aux chambres déjà contrôlées ;
- attribution des demandes les plus contraignantes en premier ;
- une chambre ne peut être attribuée qu’une fois ;
- application en transaction Prisma.

## Prochaine tranche

- champ PMR explicite sur `Room` ;
- gestion des chambres communicantes ;
- regroupement des guides et chauffeurs ;
- préférences d’étages et de bâtiments ;
- écran React de revue et modification avant validation ;
- tests unitaires du moteur de scoring.
