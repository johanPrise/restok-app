import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { typeOrmConfig } from './config/typeorm.config';
import { ActionHistoryModule } from './action-history/action-history.module';
import { GroupsModule } from './groups/groups.module';
import { ItemsModule } from './items/items.module';
import { ShoppingModule } from './shopping/shopping.module';
import { MembersModule } from './members/members.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: typeOrmConfig,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AuthModule,
    GroupsModule,
    MembersModule,
    ItemsModule,
    ShoppingModule,
    ActionHistoryModule,
    NotificationsModule,
  ],
})
export class AppModule {}
