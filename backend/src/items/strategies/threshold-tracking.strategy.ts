import { Injectable } from '@nestjs/common';
import { ActionType } from '../../action-history/entities/action-history.entity';
import { Item, ItemStatus } from '../entities/item.entity';
import {
  TrackingAction,
  TrackingResult,
  TrackingStrategy,
} from './tracking-strategy.interface';

/**
 * Suivi binaire : l'utilisateur signale « j'ai pris le dernier ».
 *
 * Pas de palier intermédiaire — `low` n'existe pas dans ce mode, on passe
 * directement de « disponible » à « épuisé ».
 */
@Injectable()
export class ThresholdTrackingStrategy implements TrackingStrategy {
  computeNext(_item: Item, action: TrackingAction): TrackingResult {
    return {
      status:
        action.type === ActionType.TAKEN
          ? ItemStatus.OUT_OF_STOCK
          : ItemStatus.AVAILABLE,
    };
  }
}
