import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { differenceInCalendarDays, subDays } from 'date-fns';
import { LessThan, Repository } from 'typeorm';
import { Item, ItemStatus } from '../../items/entities/item.entity';
import { NotificationsService } from '../notifications.service';

export const STALE_AFTER_DAYS = 3;

@Injectable()
export class StaleItemsJob {
  private readonly logger = new Logger(StaleItemsJob.name);

  constructor(
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 9 * * *')
  async remindStaleItems(): Promise<void> {
    const staleItems = await this.itemRepo.find({
      where: {
        status: ItemStatus.TO_RESTOCK,
        updatedAt: LessThan(subDays(new Date(), STALE_AFTER_DAYS)),
      },
    });

    if (staleItems.length === 0) return;

    // Un groupe reçoit une notification, pas cinq d'un coup.
    const byGroup = new Map<string, Item[]>();
    for (const item of staleItems) {
      const group = byGroup.get(item.groupId) ?? [];
      group.push(item);
      byGroup.set(item.groupId, group);
    }

    for (const [groupId, items] of byGroup) {
      try {
        await this.notificationsService.notifyGroup(
          groupId,
          this.messageFor(items),
        );
      } catch (error) {
        // Un groupe qui échoue ne doit pas priver les suivants de leur relance.
        const reason =
          error instanceof Error ? error.message : 'erreur inconnue';
        this.logger.error(
          `Relance échouée pour le groupe ${groupId}: ${reason}`,
        );
      }
    }
  }

  private messageFor(items: Item[]): string {
    if (items.length > 1) {
      return `${items.length} items à racheter`;
    }

    // Le §5 écrit « (3 jours) » en dur, ce qui reste affiché au dixième jour.
    const days = differenceInCalendarDays(new Date(), items[0].updatedAt);
    return `Toujours pas de ${items[0].name} (${days} jours)`;
  }
}
