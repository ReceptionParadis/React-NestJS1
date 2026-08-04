# Groupes — persistance et rooming lists

## Modèle de données

- `HotelGroup` : séjour, agence, DMC, tour leader, horaires, pax, chambres, bus, parking et statuts.
- `RoomingListEntry` : voyageur, type de chambre, chambre demandée, besoins spécifiques et contrôle de validité.
- `GroupPayment` : arrhes, solde, échéance, date de paiement et référence bancaire.

## API

- `GET /api/groups?hotelId=...`
- `GET /api/groups/:id`
- `POST /api/groups`
- `PATCH /api/groups/:id`
- `POST /api/groups/:id/rooming-list/import`
- `POST /api/groups/:id/payments`

## Import Excel

Écran : `/groupes/import-rooming-list?groupId=<id>&name=<nom>`

Les colonnes reconnues en français et en anglais sont : nom, prénom, sexe, date de naissance, type de chambre, chambre et observations.

L’import remplace la rooming list précédente du groupe afin d’éviter les doublons. Les lignes incomplètes sont marquées `ERROR` et les lignes exploitables `VALID`.

## Lancement

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```
