# HospiCore

**The Operating System for Hospitality**

HospiCore est une plateforme opérationnelle destinée aux équipes hôtelières. Cette première fondation contient un tableau de bord React, une API NestJS, PostgreSQL, Redis et un schéma Prisma multi-établissement.

## Prérequis

- Node.js 22+
- pnpm 10+
- Docker Desktop

## Installation

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm dev
```

## Accès local

- Application : http://localhost:3000
- API : http://localhost:3001/api
- Santé API : http://localhost:3001/api/health

## Structure

```text
apps/
  web/       Application React + Vite
  api/       API NestJS
packages/
  database/  Prisma et modèle PostgreSQL
```

## Modules amorcés

- Tableau de bord réception
- Main courante (modèle de données)
- Tickets (modèle de données)
- Hôtels, utilisateurs, rôles et chambres
- Infrastructure PostgreSQL et Redis

## Prochain sprint

- Authentification JWT
- Gestion des rôles et permissions
- API Main courante
- API Tickets
- Connexion réelle du tableau de bord à l’API
