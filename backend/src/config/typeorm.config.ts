import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ActionHistory } from '../action-history/entities/action-history.entity';
import { Group } from '../groups/entities/group.entity';
import { Item } from '../items/entities/item.entity';
import { Member } from '../members/entities/member.entity';

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
    entities: [Group, Member, Item, ActionHistory],
    // Itération rapide en dev. Les migrations prendront le relais avant le
    // déploiement — le SQL du §3 de la spec fait référence.
    synchronize: !isProduction,
    // Le log SQL est précieux en dev, illisible dans la sortie des tests.
    logging: !isProduction && !isTest,
  };
}
