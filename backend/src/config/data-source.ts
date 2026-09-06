import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { ActionHistory } from '../action-history/entities/action-history.entity';
import { Group } from '../groups/entities/group.entity';
import { Item } from '../items/entities/item.entity';
import { Member } from '../members/entities/member.entity';
import { Recipe } from '../recipes/entities/recipe.entity';
import { RecipeIngredient } from '../recipes/entities/recipe-ingredient.entity';
import { ShoppingLine } from '../shopping/entities/shopping-line.entity';
import { PasswordReset } from '../auth/entities/password-reset.entity';
import { Purchase } from '../billing/entities/purchase.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { MIGRATIONS_TABLE } from './migrations';

loadEnv();

/**
 * La `DataSource` que voit la **CLI TypeORM**, pas l'application.
 *
 * Nest construit la sienne à partir de `ConfigService` (voir `typeorm.config`),
 * qui n'existe pas hors du conteneur d'injection. La CLI a donc besoin de cet
 * accès direct, avec la même liste d'entités — c'est en les comparant à la base
 * que `migration:generate` déduit ce qu'il faut écrire.
 *
 * `synchronize: false` sans condition : une CLI qui synchroniserait appliquerait
 * le changement au lieu d'en écrire la migration, et il n'y aurait plus rien à
 * générer.
 */
// Un seul export : la CLI refuse un fichier qui en porte plusieurs.
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'restock',
  password: process.env.DB_PASSWORD ?? 'restock',
  database: process.env.DB_NAME ?? 'restock',
  entities: [
    Group,
    Member,
    PasswordReset,
    RefreshToken,
    Purchase,
    Item,
    ActionHistory,
    ShoppingLine,
    Recipe,
    RecipeIngredient,
  ],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: MIGRATIONS_TABLE,
  synchronize: false,
});
