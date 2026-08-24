# Node 22, comme la CI : une image qui compile avec une autre version que celle
# qui teste ne prouve rien sur ce qui tournera.
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

# ---------------------------------------------------------------------------
# Dépendances de compilation : tout, y compris les `devDependencies`, dont le
# compilateur TypeScript et le CLI Nest.
# ---------------------------------------------------------------------------
FROM base AS deps
# `pnpm-workspace.yaml` porte `allowBuilds` : sans lui, pnpm 11 refuse de
# compiler bcrypt, qui est un module natif.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# `--frozen-lockfile` : une image qui résout ses versions elle-même n'exécute
# pas ce que la CI a testé.
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---------------------------------------------------------------------------
# Dépendances d'exécution seules. Reconstruites à part plutôt qu'élaguées
# depuis l'étage de compilation : `pnpm prune` laisse le magasin virtuel de
# pnpm derrière lui, et l'image en garde le poids.
# ---------------------------------------------------------------------------
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---------------------------------------------------------------------------
# L'image finale ne contient ni sources, ni tests, ni compilateur.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

# `dumb-init` comme PID 1 : sans lui, Node ne reçoit pas SIGTERM et l'hébergeur
# finit par tuer le conteneur au bout de son délai de grâce, connexions en
# cours comprises.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
# La valeur est écrasée par l'hébergeur, qui impose souvent son propre port.
ENV PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# On ne tourne pas en root. L'image `node` fournit déjà l'utilisateur `node`.
USER node

EXPOSE 3000

# `migrationsRun` est vrai en production : les migrations passent au démarrage,
# avant que le port ne s'ouvre. Rien à orchestrer à côté.
CMD ["dumb-init", "node", "dist/main"]
