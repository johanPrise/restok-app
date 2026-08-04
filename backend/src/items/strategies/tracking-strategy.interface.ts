import { ActionType } from '../../action-history/entities/action-history.entity';
import { Item, ItemStatus } from '../entities/item.entity';

/**
 * L'action telle que la voit une stratégie.
 *
 * Écart avec la signature du §4 (`computeNext(item, action: ActionType)`) : un
 * rachat en mode `quantity` doit pouvoir transporter la quantité rachetée.
 * Sans elle, la stratégie du §4 renvoie `quantity: item.quantity` — un item
 * remis à « disponible » avec une quantité toujours à 0.
 */
export interface TrackingAction {
  type: ActionType;
  /** Quantité après rachat. Mode `quantity` uniquement. */
  quantity?: number;
}

export interface TrackingResult {
  status: ItemStatus;
  quantity?: number;
}

export interface TrackingStrategy {
  computeNext(item: Item, action: TrackingAction): TrackingResult;
}
