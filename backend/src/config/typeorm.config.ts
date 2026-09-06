import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
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

export function typeOrmConfig(config: ConfigService): TypeOrmModuleOptions {
  const env = config.get<string>('NODE_ENV');
  const isProduction = env === 'production';
  const isTest = env === 'test';

  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USER', 'restock'),
    password: config.get<string>('DB_PASSWORD', 'restock'),
    database: config.get<string>('DB_NAME', 'restock'),
    // Liste explicite plutôt qu'autoLoadEntities : les entités doivent être
    // connues même avant que leur module respectif n'existe.
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
    // Itération rapide en dev et dans les tests, où la base est recréée sans
    // cesse. En production, c'est aux migrations de fabriquer le schéma : sans
    // elles, `synchronize: false` démarrait contre une base vide et n'y créait
    // jamais rien.
    synchronize: !isProduction,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsTableName: MIGRATIONS_TABLE,
    // Appliquées au démarrage, et seulement en production : ailleurs
    // `synchronize` a déjà posé le schéma, et les deux se marcheraient dessus.
    migrationsRun: isProduction,
    // Le log SQL est précieux en dev, illisible dans la sortie des tests.
    logging: !isProduction && !isTest,
  };
}
