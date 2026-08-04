import { Injectable } from '@nestjs/common';
import { TrackingType } from '../entities/item.entity';
import { QuantityTrackingStrategy } from './quantity-tracking.strategy';
import { ThresholdTrackingStrategy } from './threshold-tracking.strategy';
import { TrackingStrategy } from './tracking-strategy.interface';

@Injectable()
export class TrackingStrategyFactory {
  constructor(
    private readonly threshold: ThresholdTrackingStrategy,
    private readonly quantity: QuantityTrackingStrategy,
  ) {}

  getStrategy(trackingType: TrackingType): TrackingStrategy {
    return trackingType === TrackingType.QUANTITY
      ? this.quantity
      : this.threshold;
  }
}
