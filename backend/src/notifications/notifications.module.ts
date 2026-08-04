import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from '../items/entities/item.entity';
import { Member } from '../members/entities/member.entity';
import { StaleItemsJob } from './jobs/stale-items.job';
import { NotificationListener } from './listeners/notification.listener';
import { NotificationsService } from './notifications.service';
import { ExpoPushAdapter } from './providers/expo-push.adapter';
import { PUSH_PROVIDER } from './providers/push-provider.interface';

/**
 * N'importe pas ItemsModule : le listener reçoit tout ce dont il a besoin dans
 * le payload de l'event. La seule dépendance est l'entité `Item`, pour le job
 * de relance qui interroge la base directement.
 *
 * Remplacer Expo par FCM ou des emails ne touche que le binding PUSH_PROVIDER.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Member, Item])],
  providers: [
    NotificationsService,
    NotificationListener,
    StaleItemsJob,
    { provide: PUSH_PROVIDER, useClass: ExpoPushAdapter },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
