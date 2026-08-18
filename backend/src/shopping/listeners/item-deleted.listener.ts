import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ITEM_DELETED,
  ItemDeletedEvent,
} from '../../items/events/item-deleted.event';
import { ShoppingLine } from '../entities/shopping-line.entity';

/**
 * Un item retiré de l'étagère quitte aussi la liste de courses.
 *
 * Garder « racheter du papier toilette » pour un item qui n'existe plus
 * n'aiderait personne — et la ligne s'afficherait sans nom, puisqu'elle tient
 * le sien de son item.
 *
 * Un listener plutôt qu'un appel direct : c'est **shopping** qui dépend
 * d'**items**, jamais l'inverse. L'étagère ignore que les courses existent.
 */
@Injectable()
export class ItemDeletedListener {
  constructor(
    @InjectRepository(ShoppingLine)
    private readonly lineRepo: Repository<ShoppingLine>,
  ) {}

  @OnEvent(ITEM_DELETED)
  async handleItemDeleted(event: ItemDeletedEvent): Promise<void> {
    await this.lineRepo.delete({ itemId: event.itemId });
  }
}
