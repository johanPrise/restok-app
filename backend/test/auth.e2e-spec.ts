import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp, E2EContext } from './utils/e2e-app';
import { signUp } from './utils/api';

describe('Auth (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
  });

  beforeEach(() => ctx.reset());
  afterAll(() => ctx.close());

  const post = (path: string) => request(app.getHttpServer()).post(path);

  describe('POST /auth/register', () => {
    it('crée un compte sans groupe', async () => {
      const res = await post('/auth/register')
        .send({
          name: 'Yorick',
          email: 'yorick@test.dev',
          password: 'motdepasse123',
        })
        .expect(201);

      expect(res.body.member).toMatchObject({
        name: 'Yorick',
        email: 'yorick@test.dev',
        role: 'member',
        groupId: null,
      });
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('ne renvoie jamais le mot de passe', async () => {
      const res = await post('/auth/register')
        .send({
          name: 'Yorick',
          email: 'yorick@test.dev',
          password: 'motdepasse123',
        })
        .expect(201);

      expect(JSON.stringify(res.body)).not.toContain('motdepasse123');
      expect(res.body.member).not.toHaveProperty('password');
    });

    it('ne signe que sub dans le token', async () => {
      const res = await post('/auth/register')
        .send({
          name: 'Yorick',
          email: 'yorick@test.dev',
          password: 'motdepasse123',
        })
        .expect(201);

      const claims = JSON.parse(
        Buffer.from(
          (res.body.accessToken as string).split('.')[1],
          'base64url',
        ).toString(),
      ) as Record<string, unknown>;

      expect(Object.keys(claims).sort()).toEqual(['exp', 'iat', 'sub']);
    });

    it('refuse un email déjà pris', async () => {
      const payload = {
        name: 'Yorick',
        email: 'doublon@test.dev',
        password: 'motdepasse123',
      };
      await post('/auth/register').send(payload).expect(201);

      await post('/auth/register').send(payload).expect(409);
    });

    it.each([
      [
        'nom trop court',
        { name: 'Y', email: 'a@b.dev', password: 'motdepasse123' },
      ],
      [
        'email invalide',
        { name: 'Yorick', email: 'pas-un-email', password: 'motdepasse123' },
      ],
      [
        'mot de passe trop court',
        { name: 'Yorick', email: 'a@b.dev', password: 'court' },
      ],
      ['champ manquant', { email: 'a@b.dev', password: 'motdepasse123' }],
    ])('rejette : %s', async (_label, payload) => {
      await post('/auth/register').send(payload).expect(400);
    });

    it('rejette un champ inconnu', async () => {
      // whitelist + forbidNonWhitelisted : on ne laisse pas passer `role`.
      await post('/auth/register')
        .send({
          name: 'Yorick',
          email: 'a@b.dev',
          password: 'motdepasse123',
          role: 'admin',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await post('/auth/register')
        .send({
          name: 'Yorick',
          email: 'yorick@test.dev',
          password: 'motdepasse123',
        })
        .expect(201);
    });

    it('renvoie un token', async () => {
      const res = await post('/auth/login')
        .send({ email: 'yorick@test.dev', password: 'motdepasse123' })
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('refuse un mauvais mot de passe', async () => {
      await post('/auth/login')
        .send({ email: 'yorick@test.dev', password: 'faux' })
        .expect(401);
    });

    it('renvoie le même message pour un email inconnu', async () => {
      const inconnu = await post('/auth/login')
        .send({ email: 'inconnu@test.dev', password: 'motdepasse123' })
        .expect(401);
      const mauvaisMdp = await post('/auth/login')
        .send({ email: 'yorick@test.dev', password: 'faux' })
        .expect(401);

      // Ne pas révéler quels emails existent.
      expect(inconnu.body.message).toBe(mauvaisMdp.body.message);
    });
  });

  describe('routes protégées', () => {
    it('refuse sans token', async () => {
      await request(app.getHttpServer()).get('/items').expect(401);
    });

    it('refuse un token bidon', async () => {
      await request(app.getHttpServer())
        .get('/items')
        .set('Authorization', 'Bearer pas.un.jwt')
        .expect(401);
    });

    it("refuse le token d'un compte disparu", async () => {
      const membre = await signUp(app, 'Fantome');
      await ctx.reset();

      // Le token est valide et non expiré, mais JwtStrategy relit la base.
      await request(app.getHttpServer())
        .get('/items')
        .set('Authorization', `Bearer ${membre.token}`)
        .expect(401);
    });
  });
});
