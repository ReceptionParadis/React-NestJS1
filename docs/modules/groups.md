# Module Groupes

## Route

`/groupes`

## Fonctionnalités livrées

- tableau opérationnel des groupes ;
- recherche par groupe, agence ou tour leader ;
- filtres par statut ;
- indicateurs pax, rooming lists et paiements ;
- fiche détaillée avec séjour, bus, horaires et contact ;
- mise à jour locale du statut, du paiement et des horaires ;
- check-list de préparation ;
- interface responsive.

## Données

La première tranche utilise des données de démonstration afin de valider l’ergonomie avec l’équipe de réception.

## Tranche suivante

- modèles Prisma `HotelGroup`, `GroupPayment`, `GroupBus`, `GroupMeal` et `RoomingListEntry` ;
- API NestJS CRUD ;
- formulaire complet de création ;
- import XLSX de rooming list ;
- contrôles automatiques des informations manquantes.
