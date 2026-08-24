import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp, E2EContext } from './utils/e2e-app';

describe('Contrôle de santé (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
  });

  afterAll(() => ctx.close());

  it('répond 200 quand la base est joignable', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body).toEqual({ status: 'ok' });
  });

  it('reste ouvert sans jeton — sinon il ne pourrait rien décider', async () => {
    // Pas d'en-tête d'autorisation : c'est tout l'intérêt du test. Une sonde
    // protégée par un jeton oblige l'hébergeur à s'authentifier pour savoir si
    // le service répond, ce qu'il ne fait pas.
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveProperty('status', 'ok');
      });
  });
});
