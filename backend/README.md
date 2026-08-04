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
- [x] **Étape 2 — Groupes** : création + code d'invitation, jointure, membres, guards admin
- [ ] **Étape 3 — Items** : CRUD, state machine, `action_history`
- [ ] **Étape 4 — Events & notifications** : EventEmitter, listener, Expo Push, cron
- [ ] **Étape 5 — Mobile**
- [ ] **Étape 6 — Finitions**

## Endpoints disponibles

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Inscription — crée un membre sans groupe |
| POST | `/auth/login` | public | Connexion |
| POST | `/groups` | authentifié | Créer un groupe — le créateur devient admin |
| POST | `/groups/join` | authentifié | Rejoindre via code d'invitation |
| GET | `/groups/me` | membre | Détail du groupe + nombre de membres |
| PATCH | `/groups/me` | admin | Renommer le groupe |
| DELETE | `/groups/me` | admin | Supprimer (soft-delete) |
| GET | `/members` | membre | Lister les membres du groupe |
| PATCH | `/members/me/push-token` | membre | Enregistrer le push token |
| DELETE | `/members/:id` | admin | Retirer un membre du groupe |

Trois niveaux d'accès, appliqués par des guards composables :
`JwtAuthGuard` (authentifié) → `GroupMemberGuard` (rattaché à un groupe) →
`AdminGuard` (rôle admin).

### Le token ne porte que l'identité

**Écart assumé avec le §7 de la spec.** La spec place `groupId` et `role` dans le
payload du JWT pour éviter une requête DB par appel. Ce sont des droits, pas une
identité : les signer dans un conteneur non révocable en fait un cache sans
invalidation. Conséquence mesurée sur la première implémentation — un membre
exclu de son groupe gardait l'accès en lecture jusqu'à 1h.

Le payload se limite donc à `sub`, et [`JwtStrategy`](src/auth/strategies/jwt.strategy.ts)
relit `groupId` et `role` en base à chaque requête — un `SELECT` sur clé
primaire. C'est le pattern Passport-JWT par défaut.

Ce que ça change :

| | Avant | Maintenant |
|---|---|---|
| Retrait d'un membre | effectif ≤ 1h | immédiat |
| Changement de rôle | effectif ≤ 1h | immédiat |
| Compte soft-deleted | token encore valide | token mort |
| `POST /groups` / `/groups/join` | renvoyaient un token réémis | renvoient le groupe seul |
| Coût par requête authentifiée | 0 requête | 1 `SELECT` par clé primaire |

Le client mobile n'a donc **jamais** à remplacer son token en cours de session.

Si la charge le justifiait un jour, l'optimisation se fait par un cache court
(quelques secondes) devant ce lookup — pas en remettant les droits dans le token.
