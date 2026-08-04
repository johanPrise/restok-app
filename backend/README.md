# Restock — backend

API NestJS + PostgreSQL. La spécification complète est dans [`../restock-technical-spec.md`](../restock-technical-spec.md).

## Démarrage

```bash
pnpm install
cp .env.example .env          # puis remplacer JWT_SECRET : openssl rand -hex 32
docker compose up -d          # PostgreSQL 17
pnpm start:dev
```

L'API écoute sur `http://localhost:3000`.

### Port PostgreSQL

Le conteneur est exposé sur **5434** et non 5432, parce qu'un PostgreSQL natif
occupe déjà le port par défaut sur cette machine. `DB_PORT` pilote à la fois le
mapping Docker et la connexion applicative — changer la valeur dans `.env`
suffit à déplacer les deux.

## Commandes

| Commande | Effet |
|---|---|
| `pnpm start:dev` | API en watch mode |
| `pnpm build` | Compilation TypeScript vers `dist/` |
| `pnpm test` | Tests unitaires |
| `pnpm test:cov` | Couverture |
| `pnpm lint` | ESLint avec `--fix` |

## Schéma de base

`synchronize` est actif tant que `NODE_ENV !== 'production'` : les tables sont
créées et mises à jour depuis les entités à chaque démarrage. Les migrations
prendront le relais avant le déploiement (étape 6 de la spec) ; le SQL du §3
sert de référence pour les vérifier.

Inspecter le schéma :

```bash
docker exec restock-postgres psql -U restock -d restock -c '\dt'
```

## Avancement (§11 de la spec)

- [x] **Étape 1 — Fondations** : setup NestJS, PostgreSQL, TypeORM, entités avec
      soft-delete, auth register/login JWT
- [ ] **Étape 2 — Groupes** : création + code d'invitation, jointure, membres, guards admin
- [ ] **Étape 3 — Items** : CRUD, state machine, `action_history`
- [ ] **Étape 4 — Events & notifications** : EventEmitter, listener, Expo Push, cron
- [ ] **Étape 5 — Mobile**
- [ ] **Étape 6 — Finitions**

## Endpoints disponibles

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Inscription — crée un membre sans groupe |
| POST | `/auth/login` | public | Connexion |

Le JWT porte `sub`, `groupId` et `role` (voir §7 de la spec pour le compromis
assumé sur la propagation des changements de rôle).
