import { Injectable } from '@nestjs/common';
import { ActionType } from '../../action-history/entities/action-history.entity';
import { Item, ItemStatus } from '../entities/item.entity';
import {
  TrackingAction,
  TrackingResult,
  TrackingStrategy,
} from './tracking-strategy.interface';

const DEFAULT_LOW_THRESHOLD = 1;
/** Une prise sans précision reste une unité — le geste rapide de l'étagère. */
const DEFAULT_MOVE = 1;

/**
 * Le statut se déduit toujours de la quantité, y compris après un rachat.
 *
 * Le §4 renvoie `available` en dur sur un rachat, ce qui laisse passer un item
 * « disponible » avec une quantité à 0.
 *
 * Exporté à part : `ItemsService` s'en sert aussi à la création et au passage
 * en mode quantité, sans avoir à dépendre de la stratégie concrète.
 */
export function statusForQuantity(
  quantity: number,
  lowThreshold: number | null,
): ItemStatus {
  if (quantity === 0) return ItemStatus.OUT_OF_STOCK;

  return quantity <= (lowThreshold ?? DEFAULT_LOW_THRESHOLD)
    ? ItemStatus.LOW
    : ItemStatus.AVAILABLE;
}

/**
 * Compteur numérique avec seuil bas configurable.
 *
 * Les deux actions expriment un **mouvement**, pas un stock final : on prend
 * trois unités, on en rachète six. C'est ce que les gens savent dire en
 * sortant du placard ou du magasin — leur demander le total après coup, c'est
 * leur demander de faire l'addition à la place de l'app.
 */
@Injectable()
export class QuantityTrackingStrategy implements TrackingStrategy {
  computeNext(item: Item, action: TrackingAction): TrackingResult {
    const stock = item.quantity ?? 0;
    const asked = action.quantity ?? DEFAULT_MOVE;

    if (action.type === ActionType.RESTOCKED) {
      const quantity = stock + asked;

      return {
        status: statusForQuantity(quantity, item.lowThreshold),
        quantity,
        moved: asked,
      };
    }

    // On ne consomme jamais plus que ce qu'il y a : demander trois unités
    // quand il en reste deux vide l'item et enregistre deux.
    const moved = Math.min(asked, stock);
    const quantity = stock - moved;

    return {
      status: statusForQuantity(quantity, item.lowThreshold),
      quantity,
      moved,
    };
  }
}
