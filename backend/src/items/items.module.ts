import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionHistoryModule } from '../action-history/action-history.module';
import { AuthModule } from '../auth/auth.module';
import { Item } from './entities/item.entity';
import { ItemActionsFacade } from './item-actions.facade';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { QuantityTrackingStrategy } from './strategies/quantity-tracking.strategy';
import { ThresholdTrackingStrategy } from './strategies/threshold-tracking.strategy';
import { TrackingStrategyFactory } from './strategies/tracking-strategy.factory';

/**
 * N'importe pas NotificationsModule : la communication passe uniquement par
 * l'EventEmitter global (§4). Retirer les notifications ne casserait rien ici.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Item]), AuthModule, ActionHistoryModule],
  controllers: [ItemsController],
  providers: [
    ItemsService,
    ItemActionsFacade,
    TrackingStrategyFactory,
    ThresholdTrackingStrategy,
    QuantityTrackingStrategy,
  ],
  // `ItemActionsFacade` sort pour la liste de courses : clôturer, c'est un
  // rachat en gros, qui doit passer par la même state machine que le geste.
  exports: [ItemsService, ItemActionsFacade],
})
export class ItemsModule {}
