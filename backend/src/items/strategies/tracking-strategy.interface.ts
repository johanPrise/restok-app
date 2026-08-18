import { ActionType } from '../../action-history/entities/action-history.entity';
import { Item, ItemStatus } from '../entities/item.entity';

/**
 * L'action telle que la voit une stratégie.
 *
 * Écart avec la signature du §4 (`computeNext(item, action: ActionType)`) :
 * les deux actions transportent **combien** a bougé. Sans ça, une prise vaut
 * toujours une unité et un rachat n'a pas de montant — l'app ne sait ni ce
 * qu'on a consommé, ni ce qu'on a acheté.
 */
export interface TrackingAction {
  type: ActionType;
  /**
   * Nombre d'unités prises ou rachetées — un **mouvement**, jamais un stock
   * final. Mode `quantity` uniquement ; le suivi binaire ne compte rien.
   */
  quantity?: number;
}

export interface TrackingResult {
  status: ItemStatus;
  /** Stock après l'action. */
  quantity?: number;
  /**
   * Ce qui a réellement bougé, une fois borné par le stock disponible :
   * demander trois unités quand il en reste deux n'en consomme que deux.
   * C'est cette valeur qui part dans l'historique.
   */
  moved?: number;
}

export interface TrackingStrategy {
  computeNext(item: Item, action: TrackingAction): TrackingResult;
}
