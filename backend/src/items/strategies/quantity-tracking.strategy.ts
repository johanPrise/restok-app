import { Injectable } from '@nestjs/common';
import { ActionType } from '../../action-history/entities/action-history.entity';
import { Item, ItemStatus } from '../entities/item.entity';
import {
  TrackingAction,
  TrackingResult,
  TrackingStrategy,
} from './tracking-strategy.interface';

const DEFAULT_LOW_THRESHOLD = 1;

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

/** Compteur numérique avec seuil bas configurable. */
@Injectable()
export class QuantityTrackingStrategy implements TrackingStrategy {
  computeNext(item: Item, action: TrackingAction): TrackingResult {
    const quantity =
      action.type === ActionType.RESTOCKED
        ? (action.quantity ?? item.quantity ?? 0)
        : Math.max((item.quantity ?? 0) - 1, 0);

    return { status: statusForQuantity(quantity, item.lowThreshold), quantity };
  }
}
