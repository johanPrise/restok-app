import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PUSH_PROVIDER } from '../../src/notifications/providers/push-provider.interface';
import { RecordingPushProvider } from './recording-push.provider';

export interface E2EContext {
  app: INestApplication;
  push: RecordingPushProvider;
  /** Vide les tables entre deux tests. */
  reset(): Promise<void>;
  close(): Promise<void>;
}

export async function createE2EApp(): Promise<E2EContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PUSH_PROVIDER)
    .useClass(RecordingPushProvider)
    .compile();

  const app = configureApp(moduleRef.createNestApplication());

  // `listen(0)` et pas seulement `init()` : sans serveur à l'écoute, supertest
  // en démarre un éphémère à *chaque* requête. Les helpers en créent plusieurs
  // par test, et la course entre ces serveurs produisait des 400 au corps vide
  // — le parseur HTTP de Node rejetant une requête à moitié écrite.
  await app.listen(0);

  const dataSource = app.get(DataSource);
  const push = app.get<RecordingPushProvider>(PUSH_PROVIDER);

  return {
    app,
    push,
    async reset() {
      // TRUNCATE plutôt que DELETE : ignore les contraintes et remet à zéro
      // sans se soucier de l'ordre des tables.
      await dataSource.query(
        'TRUNCATE TABLE shopping_line, action_history, item, member, "group" CASCADE',
      );
      push.clear();
      push.succeedAlways();
    },
    async close() {
      await app.close();
    },
  };
}
