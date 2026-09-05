import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AppThrottlerGuard } from './common/throttle.guard';
import { typeOrmConfig } from './config/typeorm.config';
import { ActionHistoryModule } from './action-history/action-history.module';
import { GroupsModule } from './groups/groups.module';
import { HealthModule } from './health/health.module';
import { ItemsModule } from './items/items.module';
import { RecipesModule } from './recipes/recipes.module';
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
    /**
     * Le plafond par défaut, appliqué partout.
     *
     * Il est large : quelqu'un qui coche sa liste au magasin envoie une rafale
     * de requêtes, et un plafond serré transformerait un mode hors-ligne qui
     * rejoue sa file en une panne. Ce n'est pas ici qu'on se défend — c'est sur
     * les routes publiques, où `@Throttle` resserre nettement.
     */
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AuthModule,
    HealthModule,
    GroupsModule,
    MembersModule,
    ItemsModule,
    ShoppingModule,
    RecipesModule,
    ActionHistoryModule,
    NotificationsModule,
  ],
  providers: [
    // Global : une route ajoutée demain est protégée sans qu'on y pense, ce
    // qui est le seul régime de protection qui tienne dans la durée.
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
