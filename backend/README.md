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
- [x] **Étape 3 — Items** : CRUD, state machine, `action_history`
- [x] **Étape 4 — Events & notifications** : EventEmitter, listener, Expo Push, cron
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
| GET | `/items` | membre | Lister les items du groupe |
| POST | `/items` | admin | Créer un item |
| PATCH | `/items/:id` | admin | Modifier nom / mode de suivi / seuil |
| DELETE | `/items/:id` | admin | Supprimer (soft-delete) |
| POST | `/items/:id/take` | membre | Marquer comme pris |
| POST | `/items/:id/restock` | membre | Marquer comme racheté |
| GET | `/items/:id/history` | membre | Historique d'un item |

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

## State machine des items

Le tableau des transitions vit dans
[`item-state-machine.ts`](src/items/item-state-machine.ts), séparé des
stratégies de suivi : les stratégies décident du statut *voulu*, la state
machine dit s'il est *atteignable*.

Trois écarts avec le schéma du §2, tous imposés par le mode `quantity` où le
statut se déduit du compteur et non de l'action :

| Arête ajoutée | Pourquoi |
|---|---|
| `low → available` | Un rachat sur stock bas doit remettre au vert sans passer par la rupture |
| `to_restock → low` | Un rachat partiel de 1 unité sur un seuil de 2 est légitime et laisse l'item en stock bas |
| boucles `available → available`, `low → low` | Une prise qui ne change pas de palier reste une transition |

**`out_of_stock` n'est jamais persisté.** Le §2 le fait suivre automatiquement
de `to_restock` ; cette transition est appliquée dans la même transaction, y
compris à la création d'un item et lors d'une reconfiguration qui met la
quantité à zéro. L'état existe donc dans l'ENUM et dans les events, jamais en
base.

### Events

Une action utilisateur qui vide un item émet **deux** `ItemStatusChangedEvent` —
`… → out_of_stock` puis `out_of_stock → to_restock` — pour une seule écriture.
Le §2 exige qu'une transition émette un event, et le listener du §4 réagit à
`out_of_stock` pour notifier la rupture.

Les events sont émis **après le commit** : un listener qui relit l'item voit
l'état validé, et un échec d'envoi de notification ne peut pas annuler l'action.

### Rachat en mode quantité

`POST /items/:id/restock` accepte un `quantity` — la quantité **en stock après
le rachat**. Elle est obligatoire pour un item suivi en `quantity` (400 sinon).

La spec n'a pas de champ pour ça, et la stratégie du §4 renvoie
`quantity: item.quantity` inchangée au rachat : un item vidé serait repassé
« disponible » avec une quantité toujours à 0. Le statut est ici toujours déduit
de la quantité, dans les deux sens.

## Notifications

`ItemsModule` n'importe pas `NotificationsModule`, et l'inverse est vrai aussi :
le listener reçoit tout ce dont il a besoin dans le payload de l'event. Le seul
lien est le nom de l'event.

Quand notifier :

| Transition | Message |
|---|---|
| `… → out_of_stock` | *X épuisé — quelqu'un doit racheter* |
| sortie de `to_restock` | *X racheté* |
| tout le reste | silence |

Le §5 déclenche le second cas sur `newStatus === 'available'`, ce qui **rate un
rachat partiel** qui laisse l'item en stock bas. La condition porte ici sur la
sortie de l'état « à racheter », pas sur l'état d'arrivée.

Vider un item émet deux events (`… → out_of_stock` puis `out_of_stock →
to_restock`), mais une seule notification part : le second est silencieux.

### Provider push

`NotificationsService` dépend de l'interface `PushProvider`, jamais d'Expo.
Basculer sur FCM ou des emails ne touche que le binding `PUSH_PROVIDER` dans le
module.

Trois durcissements par rapport au §6 :

- **Lots de 100 max.** Expo refuse au-delà, et le §1 cible aussi les
  associations, pas seulement des colocs de 6.
- **Un ticket manquant est un échec.** Le §6 teste `receipt?.status !== 'error'`,
  ce qui déclare réussi un envoi dont on n'a aucune trace — une réponse vide ou
  un 503 passaient pour un succès.
- **Seul `DeviceNotRegistered` efface un token.** Un échec réseau ne dit rien
  sur sa validité ; l'effacer perdrait définitivement un destinataire joignable.

`EXPO_PUSH_URL` permet de pointer un stub en test ou en staging au lieu de
l'API publique.

### Job de relance

`@Cron('0 9 * * *')` sur les items en `to_restock` depuis plus de 3 jours,
groupés par groupe — un foyer reçoit une notification, pas cinq.

**Limite connue** : la relance repart **tous les jours** à partir du 3ᵉ, sans
condition d'arrêt. Rien n'enregistre qu'un rappel a déjà été envoyé, et
`updated_at` ne bouge pas pour une notification. Un item oublié pendant trois
semaines produit 18 notifications. La spec décrit une « relance automatique »
sans dire quand s'arrêter ; la corriger demande une colonne
`last_reminded_at` sur `item`, hors périmètre du MVP.
