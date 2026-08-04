# Déploiement HospiCore Demo

Ce dépôt est préparé pour un déploiement sur Render avec :

- un service web React/Vite ;
- une API NestJS ;
- une base PostgreSQL managée.

## Variables d’environnement

### API

- `DATABASE_URL` : URL PostgreSQL fournie par l’hébergeur
- `PORT` : injecté automatiquement par Render
- `WEB_ORIGIN` : URL publique du frontend, par exemple `https://hospicore-demo.onrender.com`
- `NODE_ENV=production`

### Frontend

- `VITE_API_URL` : URL publique de l’API, par exemple `https://hospicore-api.onrender.com`

## Déploiement Render

1. Fusionner la branche de déploiement.
2. Depuis Render, créer un Blueprint à partir du fichier `render.yaml`.
3. Vérifier les variables d’environnement générées.
4. Déployer les services.
5. Exécuter la migration Prisma depuis le shell du service API :

```bash
pnpm db:deploy
```

## Vérification

- Frontend : URL du service `hospicore-demo`
- API : `https://<api>/api/health`

Le frontend fonctionne avec ses données de démonstration même si l’API n’est pas encore alimentée. Les modules persistants nécessitent PostgreSQL et les migrations Prisma.
