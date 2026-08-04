# Plan opérationnel de l’hôtel

## Route web

`/chambres`

## Fonctionnalités

- sélection du bâtiment A ou B ;
- sélection des étages 2 à 8 ;
- recherche par numéro, client ou groupe ;
- filtres par statut ;
- plan en deux ailes séparées par le couloir ;
- fiche chambre détaillée ;
- modification immédiate du statut ;
- accès rapide à la création d’un ticket ou d’une note.

## Statuts

- `AVAILABLE` : libre ;
- `OCCUPIED` : occupée ;
- `CLEANING` : en nettoyage ;
- `INSPECTED` : contrôlée ;
- `OUT_OF_ORDER` : hors service.

## API

- `GET /api/rooms?hotelId=...&building=A&floor=4`
- `GET /api/rooms/:id`
- `PATCH /api/rooms/:id/status`

## Données

L’interface embarque temporairement un jeu de démonstration fidèle aux règles connues de l’Hôtel Paradis. Le modèle Prisma et l’API sont prêts pour remplacer ces données par la base réelle.
