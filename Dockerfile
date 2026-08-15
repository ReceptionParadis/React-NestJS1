FROM node:22-alpine AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile
ENV DATABASE_URL="postgresql://hospicore:hospicore@localhost:5432/hospicore"
RUN pnpm db:generate

# Render doit reconstruire les bundles depuis les sources du commit courant.
# On supprime explicitement tout artefact potentiel avant de compiler chaque
# application, afin qu'aucun ancien dist Nest/Vite ne puisse être réutilisé.
RUN rm -rf apps/api/dist apps/web/dist .turbo apps/api/.turbo apps/web/.turbo \
  && pnpm --filter @hospicore/api build \
  && pnpm --filter @hospicore/web build \
  && test -f apps/api/dist/main.js \
  && grep -q "operational-sync" apps/api/dist/app.controller.js

ENV NODE_ENV=production
EXPOSE 10000

CMD ["sh", "-c", "attempt=1; until pnpm --filter @hospicore/database prisma:push; do if [ $attempt -ge 12 ]; then echo 'Database unavailable after 12 attempts'; exit 1; fi; echo \"Database unavailable, retry $attempt/12 in 5 seconds...\"; attempt=$((attempt+1)); sleep 5; done; exec node apps/api/dist/main.js"]
