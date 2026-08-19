import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PUSH_PROVIDER } from '../../src/notifications/providers/push-provider.interface';
import { PAGE_FETCHER } from '../../src/recipes/import/fetch-page.token';
import { RecordingPushProvider } from './recording-push.provider';

export interface E2EContext {
  app: INestApplication;
  /** Ce que le prochain import lira, au lieu d'aller sur le web. */
  setPage(html: string | Error): void;
  push: RecordingPushProvider;
  /** Vide les tables entre deux tests. */
  reset(): Promise<void>;
  close(): Promise<void>;
}

export async function createE2EApp(): Promise<E2EContext> {
  // La suite ne sort jamais sur le réseau : elle échouerait le jour où un site
  // change, ou dès qu'on la lance sans connexion.
  let page: string | Error = '<html></html>';

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PUSH_PROVIDER)
    .useClass(RecordingPushProvider)
    .overrideProvider(PAGE_FETCHER)
    .useValue(() =>
      page instanceof Error ? Promise.reject(page) : Promise.resolve(page),
    )
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
    setPage(html) {
      page = html;
    },
    async reset() {
      // TRUNCATE plutôt que DELETE : ignore les contraintes et remet à zéro
      // sans se soucier de l'ordre des tables.
      await dataSource.query(
        'TRUNCATE TABLE recipe_ingredient, recipe, shopping_line, action_history, item, member, "group" CASCADE',
      );
      push.clear();
      push.succeedAlways();
    },
    async close() {
      await app.close();
    },
  };
}
