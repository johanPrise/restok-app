# Restock — Spécification technique

> Document technique complet. Le design visuel est traité séparément dans `stock-app-design.md`.

---

## 1. Cadrage du besoin

### Problème
Dans une colocation ou une association, les consommables partagés (papier toilette, café, produits ménagers) s'épuisent sans que personne ne sache qui a pris le dernier, ni à qui revient le rachat. Résultat : frustration, ruptures répétées, et des rappels informels perdus dans un groupe WhatsApp.

### Cas d'usage
1. Un membre marque un item comme pris → si c'était le dernier, notification au groupe et passage en statut « à racheter »
2. Un membre marque un item comme racheté → stock remis à jour, action enregistrée dans l'historique
3. Un item reste « à racheter » plus de 3 jours → relance automatique du groupe
4. Un nouveau membre rejoint le groupe → accès à la liste actuelle et à l'historique
5. Consultation de l'historique → transparence sur qui a pris et racheté quoi

### Scope MVP
**Inclus** : suivi de stock, statuts, notifications push, historique, groupes avec rôles.

**Exclu (V2/V3)** : liste de courses partagée, rotation/répartition des achats, gestion des coûts, multi-groupe par membre.

Ce découpage est délibéré : la liste de courses implique une synchro temps réel avec gestion de conflits, et la rotation implique un algorithme de pondération. Les deux sont des projets à part entière, pas des ajouts.

### Public cible
Colocations (2 à 6 personnes) **et** associations/groupes plus larges, dès le MVP. Conséquence directe : le système de rôles (admin / membre) est intégré au modèle de données depuis le départ.

---

## 2. Modèle de données

### Entités

| Entité | Rôle |
|---|---|
| `group` | Le foyer ou l'association. Porte le code d'invitation. |
| `member` | Un utilisateur, rattaché à un seul groupe (MVP). Porte le rôle et le push token. |
| `item` | Un consommable suivi. Porte le statut et le mode de suivi. |
| `action_history` | Log immuable des actions (pris / racheté). |

### Relations
- `group` 1—N `member`
- `group` 1—N `item`
- `item` 1—N `action_history`
- `member` 1—N `action_history`

Un membre appartient à un seul groupe dans le MVP. Le multi-groupe nécessiterait une table de jointure `group_member` — à prévoir en V2 si le besoin apparaît, mais l'ajouter maintenant serait de la sur-ingénierie.

### Cycle de vie d'un item (state machine)

```
available ──(seuil atteint)──> low ──(dernier pris)──> out_of_stock
    ^                                                        │
    │                                                        │
    └──────────(rachat confirmé)──── to_restock <────────────┘
                                      (automatique)
```

Transitions autorisées uniquement dans ce sens. Toute transition émet un event (voir §4).

### Mode de suivi
- **`threshold`** (défaut) : suivi binaire, l'utilisateur signale simplement « j'ai pris le dernier »
- **`quantity`** (optionnel, activable par l'admin par item) : compteur numérique avec seuil bas configurable

Les colonnes `quantity` et `low_threshold` sont nullables et ne servent qu'en mode `quantity`.

---

## 3. Schéma SQL (PostgreSQL)

```sql
CREATE TYPE member_role   AS ENUM ('admin', 'member');
CREATE TYPE group_type    AS ENUM ('roommates', 'association');
CREATE TYPE item_status   AS ENUM ('available', 'low', 'out_of_stock', 'to_restock');
CREATE TYPE tracking_type AS ENUM ('threshold', 'quantity');
CREATE TYPE action_type   AS ENUM ('taken', 'restocked');

CREATE TABLE "group" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  type        group_type NOT NULL DEFAULT 'roommates',
  invite_code VARCHAR(8) UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE member (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       member_role NOT NULL DEFAULT 'member',
  push_token VARCHAR(255),
  group_id   UUID REFERENCES "group"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE item (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  status        item_status NOT NULL DEFAULT 'available',
  tracking_type tracking_type NOT NULL DEFAULT 'threshold',
  quantity      INT,
  low_threshold INT DEFAULT 1,
  group_id      UUID NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE action_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  action_type action_type NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_item_group     ON item(group_id);
CREATE INDEX idx_member_group   ON member(group_id);
CREATE INDEX idx_history_item   ON action_history(item_id);
CREATE INDEX idx_history_member ON action_history(member_id);
CREATE INDEX idx_item_status    ON item(group_id, status);
```

### Décisions notables

**UUID plutôt qu'auto-increment** — évite l'énumération d'identifiants côté API.

**ENUM natifs PostgreSQL** — la contrainte vit dans la base, pas seulement dans la couche applicative.

**Soft-delete sur `group`, `member`, `item`** — la colonne `deleted_at` préserve l'audit trail et permet une restauration. `action_history` reste en suppression réelle en cascade : c'est un log, pas une entité métier à restaurer.

**`member.group_id` nullable** — un utilisateur existe avant de rejoindre un groupe (juste après l'inscription).

**Index composite `(group_id, status)`** — la requête la plus fréquente de l'app est « tous les items d'un groupe triés par statut ».

---

## 4. Architecture backend (NestJS)

### Structure des modules

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   └── guards/
│       ├── jwt-auth.guard.ts
│       └── admin.guard.ts
│
├── groups/
│   ├── groups.module.ts
│   ├── groups.service.ts
│   ├── groups.controller.ts
│   ├── entities/group.entity.ts
│   └── dto/
│
├── members/
│   ├── members.module.ts
│   ├── members.service.ts
│   ├── members.controller.ts
│   ├── entities/member.entity.ts
│   └── dto/
│
├── items/
│   ├── items.module.ts
│   ├── items.service.ts
│   ├── items.controller.ts
│   ├── item-actions.facade.ts
│   ├── entities/item.entity.ts
│   ├── events/item-status-changed.event.ts
│   ├── strategies/
│   │   ├── tracking-strategy.interface.ts
│   │   ├── threshold-tracking.strategy.ts
│   │   ├── quantity-tracking.strategy.ts
│   │   └── tracking-strategy.factory.ts
│   └── dto/
│
├── action-history/
│   ├── action-history.module.ts
│   ├── action-history.service.ts
│   └── entities/action-history.entity.ts
│
├── notifications/
│   ├── notifications.module.ts
│   ├── notifications.service.ts
│   ├── notifications.controller.ts
│   ├── listeners/notification.listener.ts
│   ├── jobs/stale-items.job.ts
│   └── providers/
│       ├── push-provider.interface.ts
│       └── expo-push.adapter.ts
│
└── app.module.ts
```

### Graphe de dépendances

```
        AppModule
            │
   ┌────────┼────────┬──────────┬───────────────┐
   │        │        │          │               │
 Auth   Groups   Members     Items      Notifications
                               │               ▲
                               │               │
                        ActionHistory          │
                               │               │
                               └─ EventEmitter ┘
                                  (découplage)
```

**Point clé** : `ItemsModule` n'importe pas `NotificationsModule`. Les deux communiquent uniquement via l'`EventEmitter` global. Retirer ou remplacer entièrement le système de notifications (par exemple par des emails) ne casserait rien côté `Items`.

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ /* config */ }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AuthModule,
    GroupsModule,
    MembersModule,
    ItemsModule,
    ActionHistoryModule,
    NotificationsModule,
  ],
})
export class AppModule {}
```

### Patterns de conception appliqués

Trois patterns du GoF ciblent des points de variation réels du domaine : mode de suivi, provider de push, orchestration d'une action utilisateur. Les autres patterns pertinents (Observer, Mediator, Singleton, Decorator, Chain of Responsibility, Factory Method) sont déjà couverts nativement par NestJS et l'`EventEmitter` — pas besoin de les réimplémenter.

#### Strategy — mode de suivi (`threshold` / `quantity`)

Évite un `if/else` sur `trackingType` dans la logique de calcul du statut ; chaque mode devient une classe testable isolément.

```typescript
// items/strategies/tracking-strategy.interface.ts
export interface TrackingResult {
  status: ItemStatus;
  quantity?: number;
}

export interface TrackingStrategy {
  computeNext(item: Item, action: ActionType): TrackingResult;
}
```

```typescript
// items/strategies/threshold-tracking.strategy.ts
@Injectable()
export class ThresholdTrackingStrategy implements TrackingStrategy {
  computeNext(item: Item, action: ActionType): TrackingResult {
    return { status: action === 'taken' ? 'out_of_stock' : 'available' };
  }
}
```

```typescript
// items/strategies/quantity-tracking.strategy.ts
@Injectable()
export class QuantityTrackingStrategy implements TrackingStrategy {
  computeNext(item: Item, action: ActionType): TrackingResult {
    if (action === 'restocked') {
      return { status: 'available', quantity: item.quantity };
    }
    const quantity = Math.max((item.quantity ?? 0) - 1, 0);
    const status: ItemStatus =
      quantity === 0 ? 'out_of_stock' : quantity <= (item.lowThreshold ?? 1) ? 'low' : 'available';
    return { status, quantity };
  }
}
```

```typescript
// items/strategies/tracking-strategy.factory.ts
@Injectable()
export class TrackingStrategyFactory {
  constructor(
    private readonly threshold: ThresholdTrackingStrategy,
    private readonly quantity: QuantityTrackingStrategy,
  ) {}

  getStrategy(trackingType: TrackingType): TrackingStrategy {
    return trackingType === 'quantity' ? this.quantity : this.threshold;
  }
}
```

#### Adapter — provider de push découplé d'Expo

`NotificationsService` ne dépend plus de la forme de l'API Expo Push. Remplacer Expo par FCM ou un envoi email en V2 ne toucherait que cette classe.

```typescript
// notifications/providers/push-provider.interface.ts
export interface PushMessage {
  to: string;
  title: string;
  body: string;
}

export interface PushSendResult {
  token: string;
  success: boolean;
  error?: string;
}

export interface PushProvider {
  send(messages: PushMessage[]): Promise<PushSendResult[]>;
}
```

```typescript
// notifications/providers/expo-push.adapter.ts
@Injectable()
export class ExpoPushAdapter implements PushProvider {
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  async send(messages: PushMessage[]): Promise<PushSendResult[]> {
    const res = await fetch(this.EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages.map((m) => ({ ...m, sound: 'default' }))),
    });
    const json = await res.json();

    return messages.map((m, i) => {
      const receipt = json.data?.[i];
      const success = receipt?.status !== 'error';
      return { token: m.to, success, error: success ? undefined : receipt?.details?.error };
    });
  }
}
```

```typescript
// notifications/notifications.module.ts
export const PUSH_PROVIDER = 'PUSH_PROVIDER';

@Module({
  providers: [
    NotificationsService,
    NotificationListener,
    StaleItemsJob,
    { provide: PUSH_PROVIDER, useClass: ExpoPushAdapter },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

#### Facade — orchestration d'une action (take/restock)

`ItemActionsFacade` regroupe calcul du statut (via Strategy), écriture de l'historique et émission d'event derrière deux méthodes simples. `ItemsService` reste dédié au CRUD ; les endpoints `/items/:id/take` et `/items/:id/restock` (§8) appellent la facade, pas `ItemsService` directement.

```typescript
// items/item-actions.facade.ts
@Injectable()
export class ItemActionsFacade {
  constructor(
    @InjectRepository(Item) private readonly itemRepo: Repository<Item>,
    private readonly trackingStrategyFactory: TrackingStrategyFactory,
    private readonly actionHistoryService: ActionHistoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  take(itemId: string, memberId: string) {
    return this.applyAction(itemId, memberId, 'taken');
  }

  restock(itemId: string, memberId: string) {
    return this.applyAction(itemId, memberId, 'restocked');
  }

  private async applyAction(itemId: string, memberId: string, action: ActionType) {
    const item = await this.itemRepo.findOneOrFail({ where: { id: itemId } });
    const previousStatus = item.status;

    const strategy = this.trackingStrategyFactory.getStrategy(item.trackingType);
    const { status, quantity } = strategy.computeNext(item, action);

    item.status = status;
    if (quantity !== undefined) item.quantity = quantity;
    await this.itemRepo.save(item);
    await this.actionHistoryService.record(itemId, memberId, action);

    this.eventEmitter.emit(
      'item.status.changed',
      new ItemStatusChangedEvent(item.id, item.name, item.groupId, previousStatus, status, memberId),
    );

    return item;
  }
}
```

---

## 5. Système d'events

### Définition

```typescript
// items/events/item-status-changed.event.ts
export class ItemStatusChangedEvent {
  constructor(
    public readonly itemId: string,
    public readonly itemName: string,
    public readonly groupId: string,
    public readonly previousStatus: ItemStatus,
    public readonly newStatus: ItemStatus,
    public readonly triggeredByMemberId: string,
  ) {}
}
```

### Émission

Émise depuis `ItemActionsFacade.applyAction` (voir §4, pattern Facade) — pas depuis `ItemsService`, qui reste dédié au CRUD.

### Écoute

```typescript
// notifications/listeners/notification.listener.ts
@Injectable()
export class NotificationListener {
  constructor(private readonly notificationService: NotificationsService) {}

  @OnEvent('item.status.changed')
  async handleStatusChange(event: ItemStatusChangedEvent) {
    if (event.newStatus === 'out_of_stock') {
      await this.notificationService.notifyGroup(
        event.groupId,
        `${event.itemName} épuisé — quelqu'un doit racheter`,
        { excludeMemberId: event.triggeredByMemberId },
      );
    }

    if (event.newStatus === 'available' && event.previousStatus === 'to_restock') {
      await this.notificationService.notifyGroup(
        event.groupId,
        `${event.itemName} racheté`,
        { excludeMemberId: event.triggeredByMemberId },
      );
    }
  }
}
```

Détail : celui qui déclenche l'action ne reçoit pas sa propre notification (`excludeMemberId`).

### Job de relance

```typescript
// notifications/jobs/stale-items.job.ts
@Injectable()
export class StaleItemsJob {
  @Cron('0 9 * * *') // tous les jours à 9h
  async remindStaleItems() {
    const threeDaysAgo = subDays(new Date(), 3);

    const staleItems = await this.itemRepo.find({
      where: { status: 'to_restock', updatedAt: LessThan(threeDaysAgo) },
    });

    const byGroup = groupBy(staleItems, 'groupId');

    for (const [groupId, items] of Object.entries(byGroup)) {
      const message = items.length === 1
        ? `Toujours pas de ${items[0].name} (3 jours)`
        : `${items.length} items à racheter`;
      await this.notificationService.notifyGroup(groupId, message);
    }
  }
}
```

Le groupage par groupe évite d'envoyer 5 notifications d'un coup au même foyer.

---

## 6. Notifications push (Expo)

### Flow
1. À l'installation, l'app mobile obtient un `expoPushToken`
2. Le token est envoyé au backend via `PATCH /members/me/push-token` et stocké sur `member`
3. Le backend appelle l'API Expo Push avec les tokens du groupe

### Backend

`NotificationsService` dépend de l'interface `PushProvider` (§4, pattern Adapter), pas d'Expo directement.

```typescript
// notifications/notifications.service.ts
@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PUSH_PROVIDER) private readonly pushProvider: PushProvider,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
  ) {}

  async notifyGroup(
    groupId: string,
    body: string,
    options?: { excludeMemberId?: string },
  ) {
    const members = await this.memberRepo.find({
      where: { groupId, pushToken: Not(IsNull()) },
    });

    const targets = members.filter((m) => m.id !== options?.excludeMemberId);
    if (targets.length === 0) return;

    const messages = targets.map((m) => ({
      to: m.pushToken!,
      title: 'Restock',
      body,
    }));

    const results = await this.pushProvider.send(messages);
    await this.handleFailedTokens(results);
  }

  // Nettoie les tokens invalides (app désinstallée, token expiré)
  private async handleFailedTokens(results: PushSendResult[]) {
    const invalid = results.filter((r) => !r.success && r.error === 'DeviceNotRegistered');
    await Promise.all(
      invalid.map((r) => this.memberRepo.update({ pushToken: r.token }, { pushToken: null })),
    );
  }
}
```

### Mobile

```typescript
import * as Notifications from 'expo-notifications';

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await api.patch('/members/me/push-token', { pushToken: token });
  return token;
}
```

La permission est demandée **en contexte** (au moment où l'utilisateur rejoint un groupe), jamais au premier lancement à froid.

---

## 7. Authentification

### Flow
1. Inscription email/password → `member` créé avec `group_id: null`
2. Soit création d'un groupe → devient `admin` de ce groupe
3. Soit jointure via code d'invitation → devient `member`

Le code d'invitation est préféré à l'invitation par email : pas de service SMTP à configurer, et ça correspond à l'usage réel (partager un code dans un groupe de discussion).

### Service

```typescript
// auth/auth.service.ts
@Injectable()
export class AuthService {
  async register(dto: RegisterDto) {
    const password = await bcrypt.hash(dto.password, 10);
    const member = await this.memberRepo.save({
      name: dto.name, email: dto.email, password, groupId: null,
    });
    return this.generateToken(member);
  }

  async login(dto: LoginDto) {
    const member = await this.memberRepo.findOne({ where: { email: dto.email } });
    if (!member || !(await bcrypt.compare(dto.password, member.password))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    return this.generateToken(member);
  }

  private generateToken(member: Member) {
    const payload = { sub: member.id, groupId: member.groupId, role: member.role };
    return { accessToken: this.jwtService.sign(payload, { expiresIn: '1h' }) };
  }
}
```

### Groupes

```typescript
// groups/groups.service.ts
async create(dto: CreateGroupDto, creatorId: string) {
  const inviteCode = nanoid(8).toUpperCase();
  const group = await this.groupRepo.save({ ...dto, inviteCode });
  await this.memberRepo.update(creatorId, { groupId: group.id, role: 'admin' });
  return group;
}

async join(inviteCode: string, memberId: string) {
  const group = await this.groupRepo.findOne({ where: { inviteCode } });
  if (!group) throw new NotFoundException("Ce code ne correspond à aucun groupe");
  await this.memberRepo.update(memberId, { groupId: group.id, role: 'member' });
  return group;
}
```

### Guards

```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.user?.role === 'admin';
  }
}
```

**Compromis assumé** : le JWT porte `groupId` et `role`, ce qui évite une requête DB à chaque appel pour vérifier les permissions. En contrepartie, un changement de rôle n'est effectif qu'à l'expiration du token — d'où la durée de vie courte (1h). Un refresh token est la suite logique si le besoin se confirme.

---

## 8. API — endpoints

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Inscription |
| POST | `/auth/login` | public | Connexion |
| POST | `/groups` | authentifié | Créer un groupe (devient admin) |
| POST | `/groups/join` | authentifié | Rejoindre via code |
| GET | `/groups/me` | membre | Détail du groupe courant |
| PATCH | `/groups/me` | admin | Renommer le groupe |
| DELETE | `/groups/me` | admin | Supprimer (soft-delete) |
| GET | `/members` | membre | Lister les membres du groupe |
| DELETE | `/members/:id` | admin | Retirer un membre |
| PATCH | `/members/me/push-token` | membre | Enregistrer le push token |
| GET | `/items` | membre | Lister les items du groupe |
| POST | `/items` | admin | Créer un item |
| PATCH | `/items/:id` | admin | Modifier nom / mode de suivi |
| DELETE | `/items/:id` | admin | Supprimer (soft-delete) |
| POST | `/items/:id/take` | membre | Marquer comme pris |
| POST | `/items/:id/restock` | membre | Marquer comme racheté |
| GET | `/items/:id/history` | membre | Historique d'un item |

---

## 9. Stack mobile (React Native)

| Besoin | Choix | Raison |
|---|---|---|
| Framework | Expo | Gère la couche native FCM/APNs, build via EAS |
| Navigation | `expo-router` | Routing par fichiers, proche de Next.js |
| État global | Zustand | Utilisateur connecté et groupe actif uniquement — pas besoin de Redux ici |
| État serveur | TanStack Query | Cache, refetch, invalidation après réception d'une notif |
| Stockage token | `expo-secure-store` | Plus sûr qu'AsyncStorage pour un JWT |
| Push | `expo-notifications` | Voir §6 |

### Structure

```
app/                          (expo-router)
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
├── (onboarding)/
│   └── join-or-create.tsx
├── (main)/
│   ├── index.tsx             (The Shelf)
│   ├── items/[id].tsx
│   └── settings.tsx
└── _layout.tsx

src/
├── api/                      (clients + hooks TanStack Query)
├── store/                    (Zustand)
├── components/
├── hooks/
└── types/
```

**Séparation des responsabilités** : Zustand ne gère que l'état vraiment global (session, groupe actif) ; TanStack Query gère tout l'état serveur (items, membres, historique). Aucun chevauchement entre les deux.

---

## 10. Tests

Le point le plus important à ne pas repousser.

| Cible | Type | Ce qui est testé |
|---|---|---|
| `ItemsService.computeNextStatus` | unitaire | Toutes les transitions de la state machine, y compris les transitions interdites |
| `ItemsService.markAsTaken` | unitaire | Émission de l'event avec le bon payload (EventEmitter mocké) |
| `NotificationListener` | unitaire | Réagit au bon statut, exclut bien l'auteur de l'action |
| `AuthService` | unitaire | Hash du password, rejet des mauvais identifiants, contenu du JWT |
| `GroupsService.join` | unitaire | Code valide / invalide, attribution du rôle |
| `AdminGuard` | unitaire | Autorise admin, rejette member |
| Endpoints items | e2e | Parcours complet take → notif → restock |

Le découplage par events rend `ItemsService` testable sans monter tout le système de notifications — c'est exactement le bénéfice concret du choix d'architecture.

---

## 11. Ordre de développement

**Étape 1 — Fondations**
Setup NestJS + PostgreSQL + TypeORM, entités avec soft-delete, auth register/login JWT.

**Étape 2 — Groupes**
Création (avec génération du code), jointure, liste des membres, guards admin.

**Étape 3 — Items**
CRUD, state machine des statuts, écriture dans `action_history`. Tests unitaires de la state machine dès cette étape.

**Étape 4 — Events & notifications**
`EventEmitterModule`, listener, intégration Expo Push, job cron de relance.

**Étape 5 — Mobile**
Peut démarrer dès la fin de l'étape 2 (l'auth doit être fonctionnelle). Écrans auth → groupe → shelf → détail item → push.

**Étape 6 — Finitions**
Couverture de tests, README avec schéma d'architecture, déploiement backend (Railway ou Render) + build Expo EAS.

**Seule vraie dépendance bloquante** : l'auth doit être opérationnelle avant tout travail mobile réel. Le reste peut avancer dans un ordre flexible.

---

## 12. Évolutions prévues (hors MVP)

### V2 — Liste de courses partagée
Nécessite une synchro temps réel entre plusieurs clients et une gestion des doublons. Piste : WebSocket ou polling optimiste via TanStack Query.

### V3 — Rotation des achats
Deux approches :

**Round-robin** — simple, mais injuste si quelqu'un est absent.

```typescript
function getNextToRestock(members: Member[], lastRestockerId: string): Member {
  const i = members.findIndex((m) => m.id === lastRestockerId);
  return members[(i + 1) % members.length];
}
```

**Pondéré par le coût** — plus juste, nécessite `ALTER TABLE action_history ADD COLUMN cost DECIMAL(10,2);`. Le prochain acheteur est celui dont le cumul est le plus bas sur les 30 derniers jours.

La colonne `cost` n'est délibérément pas ajoutée au MVP : `action_history` est conçu comme une table d'events extensible, l'ajout se fera par simple migration le jour où la fonctionnalité arrive.

### Autres pistes
- Multi-groupe par membre (table de jointure `group_member`)
- Catégories d'items et filtres
- Export de l'historique
