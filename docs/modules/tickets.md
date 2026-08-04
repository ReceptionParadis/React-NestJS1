# Module Tickets

Le module Tickets centralise les incidents et demandes opérationnelles de l’hôtel.

## Interface

Route : `/tickets`

Fonctionnalités :

- vue Kanban par statut ;
- recherche par référence, chambre, description ou responsable ;
- filtre par service ;
- création rapide ;
- affectation à un collaborateur ;
- modification du statut ;
- priorités basse, normale, haute et critique ;
- commentaires et historique ;
- affichage responsive.

## API

- `GET /api/tickets`
- `POST /api/tickets`
- `PATCH /api/tickets/:id/status`
- `PATCH /api/tickets/:id/assign`
- `POST /api/tickets/:id/comments`

## Données

Les tickets peuvent être rattachés à une chambre, un hôtel, un demandeur et un responsable. Les changements majeurs sont enregistrés dans `TicketEvent`.
