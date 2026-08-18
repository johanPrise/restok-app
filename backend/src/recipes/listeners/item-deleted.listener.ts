import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ITEM_DELETED,
  ItemDeletedEvent,
} from '../../items/events/item-deleted.event';
import { RecipeIngredient } from '../entities/recipe-ingredient.entity';

/**
 * Un item retiré de l'étagère devient un ingrédient libre.
 *
 * **Le même event que les courses, la conséquence opposée**, et c'est voulu :
 * une ligne de courses est transitoire, on la supprime ; une recette est un
 * document que le groupe garde. La vider laisserait un risotto sans riz, sans
 * que personne ne puisse savoir ce qui manquait.
 *
 * L'ingrédient garde donc son nom et cesse simplement de compter pour la
 * faisabilité — ce qui est exact : ce que le groupe ne suit plus, il ne peut
 * plus dire s'il l'a.
 *
 * Deux abonnés sur un même event avec deux réponses : c'est ce que le
 * découplage par events permet, et la raison de l'avoir choisi.
 */
@Injectable()
export class RecipeItemDeletedListener {
  constructor(
    @InjectRepository(RecipeIngredient)
    private readonly ingredientRepo: Repository<RecipeIngredient>,
  ) {}

  @OnEvent(ITEM_DELETED)
  async handleItemDeleted(event: ItemDeletedEvent): Promise<void> {
    // Le nom vient de l'event : l'item est soft-deleted, le relire d'ici
    // demanderait un `withDeleted` que cet abonné n'a pas à connaître.
    await this.ingredientRepo.update(
      { itemId: event.itemId },
      { itemId: null, label: event.itemName },
    );
  }
}
