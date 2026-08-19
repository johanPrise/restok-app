import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Item } from '../items/entities/item.entity';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { Recipe } from './entities/recipe.entity';
import { fetchPage } from './import/fetch-page';
import { PAGE_FETCHER } from './import/fetch-page.token';
import { RecipeItemDeletedListener } from './listeners/item-deleted.listener';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

/**
 * `Item` est importé pour une seule vérification — qu'un ingrédient lié pointe
 * bien vers un item du groupe. Aucune dépendance vers `ItemsModule` : les
 * recettes ne déclenchent aucune action sur le stock en v1, et l'étagère
 * continue d'ignorer qu'elles existent.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeIngredient, Item]),
    AuthModule,
  ],
  controllers: [RecipesController],
  providers: [
    RecipesService,
    RecipeItemDeletedListener,
    { provide: PAGE_FETCHER, useValue: fetchPage },
  ],
})
export class RecipesModule {}
