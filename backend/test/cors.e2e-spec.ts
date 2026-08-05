import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp, E2EContext } from './utils/e2e-app';

/**
 * Un navigateur ne laisse pas partir la requête sans l'en-tête de réponse
 * adéquat. C'est invisible depuis un client React Native, et c'est justement
 * pour ça que ça mérite un test.
 */
describe('CORS (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
  });

  afterAll(() => ctx.close());

  it('autorise une origine en développement', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', 'http://localhost:8081')
      .send({ email: 'inconnu@test.dev', password: 'motdepasse123' });

    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:8081',
    );
  });

  it('répond au préflight avec les méthodes attendues', async () => {
    const res = await request(app.getHttpServer())
      .options('/items')
      .set('Origin', 'http://localhost:8081')
      .set('Access-Control-Request-Method', 'PATCH')
      .expect(204);

    expect(res.headers['access-control-allow-methods']).toContain('PATCH');
  });

  it("laisse passer l'en-tête Authorization", async () => {
    const res = await request(app.getHttpServer())
      .options('/items')
      .set('Origin', 'http://localhost:8081')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization')
      .expect(204);

    // Sans ça le token ne peut pas être joint depuis un navigateur.
    expect(
      res.headers['access-control-allow-headers']?.toLowerCase(),
    ).toContain('authorization');
  });
});
