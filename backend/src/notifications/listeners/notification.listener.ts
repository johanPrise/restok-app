import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ItemStatus } from '../../items/entities/item.entity';
import {
  ITEM_STATUS_CHANGED,
  ItemStatusChangedEvent,
} from '../../items/events/item-status-changed.event';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent(ITEM_STATUS_CHANGED)
  async handleStatusChange(event: ItemStatusChangedEvent): Promise<void> {
    const message = this.messageFor(event);
    if (!message) return;

    try {
      await this.notificationsService.notifyGroup(event.groupId, message, {
        excludeMemberId: event.triggeredByMemberId,
      });
    } catch (error) {
      // L'action utilisateur est déjà committée : un échec d'envoi ne doit pas
      // remonter en exception non gérée.
      const reason = error instanceof Error ? error.message : 'erreur inconnue';
      this.logger.error(`Notification non envoyée : ${reason}`);
    }
  }

  private messageFor(event: ItemStatusChangedEvent): string | null {
    if (event.newStatus === ItemStatus.OUT_OF_STOCK) {
      return `${event.itemName} épuisé — quelqu'un doit racheter`;
    }

    // Le §5 teste `newStatus === 'available'`, ce qui rate un rachat partiel
    // qui laisse l'item en stock bas. Ce qui compte est la sortie de l'état
    // « à racheter », pas l'état d'arrivée.
    if (
      event.previousStatus === ItemStatus.TO_RESTOCK &&
      event.newStatus !== ItemStatus.TO_RESTOCK
    ) {
      return `${event.itemName} racheté`;
    }

    return null;
  }
}
