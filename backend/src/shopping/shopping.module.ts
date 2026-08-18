import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Item } from '../items/entities/item.entity';
import { ItemsModule } from '../items/items.module';
import { ShoppingLine } from './entities/shopping-line.entity';
import { ItemDeletedListener } from './listeners/item-deleted.listener';
import { ShoppingController } from './shopping.controller';
import { ShoppingService } from './shopping.service';

/**
 * Importe `ItemsModule` pour la clôture : les lignes cochées deviennent des
 * rachats, et ceux-ci doivent passer par la state machine plutôt que d'écrire
 * dans `item` en douce. La dépendance ne va que dans ce sens — l'étagère, elle,
 * ignore que les courses existent.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ShoppingLine, Item]),
    AuthModule,
    ItemsModule,
  ],
  controllers: [ShoppingController],
  providers: [ShoppingService, ItemDeletedListener],
  exports: [ShoppingService],
})
export class ShoppingModule {}
