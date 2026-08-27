import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { ActionHistoryService } from '../action-history/action-history.service';
import { ActionType } from '../action-history/entities/action-history.entity';
import { Item, ItemStatus, TrackingType } from './entities/item.entity';
import {
  ITEM_STATUS_CHANGED,
  ItemStatusChangedEvent,
} from './events/item-status-changed.event';
import { assertTransition, autoTransition } from './item-state-machine';
import { TrackingAction } from './strategies/tracking-strategy.interface';
import { TrackingStrategyFactory } from './strategies/tracking-strategy.factory';
import { BUSINESS_CODES, badRequest, conflict } from '../common/business-error';

/** États dans lesquels il n'y a plus rien à prendre. */
const EMPTY_STATUSES: readonly ItemStatus[] = [
  ItemStatus.OUT_OF_STOCK,
  ItemStatus.TO_RESTOCK,
];

/**
 * Orchestre une action utilisateur : calcul du statut (Strategy), écriture de
 * l'historique, émission des events.
 *
 * `ItemsService` reste dédié au CRUD — c'est cette façade que les endpoints
 * `/items/:id/take` et `/items/:id/restock` appellent.
 */
@Injectable()
export class ItemActionsFacade {
  constructor(
    private readonly dataSource: DataSource,
    private readonly trackingStrategyFactory: TrackingStrategyFactory,
    private readonly actionHistoryService: ActionHistoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** `quantity` : combien d'unités on prend. Une seule par défaut. */
  take(
    itemId: string,
    groupId: string,
    memberId: string,
    quantity?: number,
  ): Promise<Item> {
    return this.applyAction(itemId, groupId, memberId, {
      type: ActionType.TAKEN,
      quantity,
    });
  }

  /** `quantity` : combien d'unités on rapporte, pas le stock final. */
  restock(
    itemId: string,
    groupId: string,
    memberId: string,
    quantity?: number,
  ): Promise<Item> {
    return this.applyAction(itemId, groupId, memberId, {
      type: ActionType.RESTOCKED,
      quantity,
    });
  }

  private async applyAction(
    itemId: string,
    groupId: string,
    memberId: string,
    action: TrackingAction,
  ): Promise<Item> {
    const events: ItemStatusChangedEvent[] = [];

    const item = await this.dataSource.transaction(async (manager) => {
      const itemRepo = manager.getRepository(Item);

      // Le filtre sur groupId isole les groupes : un item d'un autre foyer est
      // introuvable, pas interdit.
      const item = await itemRepo.findOne({ where: { id: itemId, groupId } });
      if (!item) {
        throw new NotFoundException('Item introuvable');
      }

      this.assertActionApplicable(item, action);

      const { status, quantity, moved } = this.trackingStrategyFactory
        .getStrategy(item.trackingType)
        .computeNext(item, action);

      const previousStatus = item.status;
      assertTransition(previousStatus, status);
      events.push(this.buildEvent(item, previousStatus, status, memberId));

      let finalStatus = status;
      const automatic = autoTransition(status);
      if (automatic) {
        assertTransition(status, automatic);
        events.push(this.buildEvent(item, status, automatic, memberId));
        finalStatus = automatic;
      }

      // Une seule écriture : l'état intermédiaire `out_of_stock` n'est jamais
      // observable puisque la transition est automatique et dans la même
      // transaction. Les deux events sont émis quand même — le §2 exige qu'une
      // transition émette un event, et le listener du §4 réagit à
      // `out_of_stock` pour notifier la rupture.
      item.status = finalStatus;
      if (quantity !== undefined) item.quantity = quantity;
      await itemRepo.save(item);

      // `moved` et non `action.quantity` : c'est ce qui a bougé pour de vrai,
      // une fois borné par le stock. Rester à `null` en suivi binaire, qui ne
      // compte rien.
      await this.actionHistoryService.record(
        itemId,
        memberId,
        action.type,
        moved ?? null,
        manager,
      );

      return item;
    });

    // Après commit : un listener qui relit l'item en base voit l'état validé,
    // et un échec de notification ne peut pas annuler l'action.
    for (const event of events) {
      this.eventEmitter.emit(ITEM_STATUS_CHANGED, event);
    }

    return item;
  }

  private assertActionApplicable(item: Item, action: TrackingAction): void {
    if (
      action.type === ActionType.TAKEN &&
      EMPTY_STATUSES.includes(item.status)
    ) {
      throw conflict(
        BUSINESS_CODES.ITEM_ALREADY_EMPTY,
        `« ${item.name} » est déjà épuisé — il n'y a plus rien à prendre`,
        { nom: item.name },
      );
    }

    if (
      action.type === ActionType.RESTOCKED &&
      item.trackingType === TrackingType.QUANTITY &&
      action.quantity === undefined
    ) {
      throw badRequest(
        BUSINESS_CODES.RESTOCK_QUANTITY_REQUIRED,
        `« ${item.name} » est suivi en quantité : précise la quantité rachetée`,
        { nom: item.name },
      );
    }
  }

  private buildEvent(
    item: Item,
    previousStatus: ItemStatus,
    newStatus: ItemStatus,
    memberId: string,
  ): ItemStatusChangedEvent {
    return new ItemStatusChangedEvent(
      item.id,
      item.name,
      item.groupId,
      previousStatus,
      newStatus,
      memberId,
    );
  }
}
