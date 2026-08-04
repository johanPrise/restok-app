import { INestApplication } from '@nestjs/common';
import { auth, createGroupWith, signUp, TestMember } from './utils/api';
import { createE2EApp, E2EContext } from './utils/e2e-app';

describe('Groups & members (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;
  let alice: TestMember;
  let bob: TestMember;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
  });

  beforeEach(async () => {
    await ctx.reset();
    alice = await signUp(app, 'Alice');
    bob = await signUp(app, 'Bob');
  });

  afterAll(() => ctx.close());

  describe('POST /groups', () => {
    it("fait du créateur l'admin du groupe", async () => {
      const res = await auth(app, alice)
        .post('/groups')
        .send({ name: 'Coloc Bastille' })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Coloc Bastille',
        type: 'roommates',
      });

      // Le token n'a pas changé et pourtant les droits ont suivi.
      await auth(app, alice)
        .patch('/groups/me')
        .send({ name: 'Coloc Voltaire' })
        .expect(200);
    });

    it("génère un code d'invitation sans caractère ambigu", async () => {
      const res = await auth(app, alice)
        .post('/groups')
        .send({ name: 'Coloc' })
        .expect(201);

      expect(res.body.inviteCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{8}$/);
    });

    it('donne un code différent à chaque groupe', async () => {
      const premier = await auth(app, alice)
        .post('/groups')
        .send({ name: 'Premier groupe' })
        .expect(201);
      const second = await auth(app, bob)
        .post('/groups')
        .send({ name: 'Second groupe' })
        .expect(201);

      expect(premier.body.inviteCode).not.toBe(second.body.inviteCode);
    });

    it('refuse un second groupe', async () => {
      await createGroupWith(app, alice);

      await auth(app, alice)
        .post('/groups')
        .send({ name: 'Deuxième' })
        .expect(409);
    });

    it('rejette un type inconnu', async () => {
      await auth(app, alice)
        .post('/groups')
        .send({ name: 'Coloc', type: 'secte' })
        .expect(400);
    });
  });

  describe('POST /groups/join', () => {
    it.each([
      ['minuscules', (code: string) => code.toLowerCase()],
      ['espaces autour', (code: string) => ` ${code} `],
      ['les deux', (code: string) => `  ${code.toLowerCase()}\n`],
    ])('accepte un code collé avec %s', async (_label, mangle) => {
      // Un code recopié depuis une conversation traîne souvent une espace.
      const group = await createGroupWith(app, alice);

      await auth(app, bob)
        .post('/groups/join')
        .send({ inviteCode: mangle(group.inviteCode) })
        .expect(200);
    });

    it('rejette un code de la mauvaise longueur', async () => {
      await auth(app, bob)
        .post('/groups/join')
        .send({ inviteCode: 'TROPCOURT1' })
        .expect(400);
    });

    it('donne accès au groupe sur-le-champ', async () => {
      const group = await createGroupWith(app, alice, [bob]);

      const res = await auth(app, bob).get('/groups/me').expect(200);
      expect(res.body.id).toBe(group.id);
    });

    it('entre comme simple membre', async () => {
      await createGroupWith(app, alice, [bob]);

      await auth(app, bob).patch('/groups/me').send({ name: 'X' }).expect(403);
    });

    it('rejette un code inconnu', async () => {
      await auth(app, bob)
        .post('/groups/join')
        .send({ inviteCode: 'ZZZZZZZZ' })
        .expect(404);
    });
  });

  describe('accès sans groupe', () => {
    it.each(['/groups/me', '/members', '/items'])(
      'GET %s renvoie 403',
      async (path) => {
        await auth(app, alice).get(path).expect(403);
      },
    );
  });

  describe('GET /groups/me', () => {
    it('compte les membres', async () => {
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, alice, [bob, carol]);

      const res = await auth(app, bob).get('/groups/me').expect(200);
      expect(res.body.memberCount).toBe(3);
    });
  });

  describe('GET /members', () => {
    it("n'expose ni mot de passe ni push token", async () => {
      await createGroupWith(app, alice, [bob]);

      const res = await auth(app, bob).get('/members').expect(200);

      expect(res.body).toHaveLength(2);
      for (const member of res.body as Record<string, unknown>[]) {
        expect(member).not.toHaveProperty('password');
        expect(member).not.toHaveProperty('pushToken');
      }
    });

    it('ne montre que les membres de son groupe', async () => {
      await createGroupWith(app, alice, [bob]);
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol);

      const res = await auth(app, carol).get('/members').expect(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('DELETE /members/:id', () => {
    it("coupe l'accès immédiatement, sans supprimer le compte", async () => {
      await createGroupWith(app, alice, [bob]);

      await auth(app, alice).delete(`/members/${bob.id}`).expect(204);

      // Même token qu'avant le retrait.
      await auth(app, bob).get('/members').expect(403);
      // Le compte vit toujours : il peut rejoindre ailleurs.
      const carol = await signUp(app, 'Carol');
      const autre = await createGroupWith(app, carol);
      await auth(app, bob)
        .post('/groups/join')
        .send({ inviteCode: autre.inviteCode })
        .expect(200);
    });

    it('refuse à un simple membre', async () => {
      await createGroupWith(app, alice, [bob]);

      await auth(app, bob).delete(`/members/${alice.id}`).expect(403);
    });

    it("empêche l'admin de se retirer lui-même", async () => {
      await createGroupWith(app, alice, [bob]);

      await auth(app, alice).delete(`/members/${alice.id}`).expect(400);
    });

    it("traite un membre d'un autre groupe comme introuvable", async () => {
      await createGroupWith(app, alice);
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol, [bob]);

      await auth(app, alice).delete(`/members/${bob.id}`).expect(404);
    });

    it("rejette un identifiant qui n'est pas un UUID", async () => {
      await createGroupWith(app, alice, [bob]);

      await auth(app, alice).delete('/members/pas-un-uuid').expect(400);
    });
  });

  describe('DELETE /groups/me', () => {
    it('détache les membres et libère le code', async () => {
      const group = await createGroupWith(app, alice, [bob]);

      await auth(app, alice).delete('/groups/me').expect(204);

      await auth(app, alice).get('/groups/me').expect(403);
      await auth(app, bob).get('/groups/me').expect(403);
      await auth(app, bob)
        .post('/groups/join')
        .send({ inviteCode: group.inviteCode })
        .expect(404);
    });

    it('refuse à un simple membre', async () => {
      await createGroupWith(app, alice, [bob]);

      await auth(app, bob).delete('/groups/me').expect(403);
    });
  });

  describe('PATCH /members/me/push-token', () => {
    it('enregistre le token', async () => {
      await createGroupWith(app, alice);

      await auth(app, alice)
        .patch('/members/me/push-token')
        .send({ pushToken: 'ExponentPushToken[abc]' })
        .expect(204);
    });

    it('rejette un corps vide', async () => {
      await createGroupWith(app, alice);

      await auth(app, alice)
        .patch('/members/me/push-token')
        .send({})
        .expect(400);
    });
  });
});
