FROM node:22-alpine AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile
RUN pnpm db:generate
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 10000

CMD ["sh", "-c", "pnpm --filter @hospicore/database prisma:push && pnpm --filter @hospicore/api start"]
