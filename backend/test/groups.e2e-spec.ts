import { INestApplication } from '@nestjs/common';
import request from 'supertest';
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

  describe('groupe solo', () => {
    it('accepte un groupe d’une seule personne', async () => {
      const alice = await signUp(app, 'Alice');

      const res = await auth(app, alice)
        .post('/groups')
        .send({ name: 'Chez moi', type: 'solo' })
        .expect(201);

      expect(res.body.type).toBe('solo');
    });

    it('cesse d’être solo dès que quelqu’un rejoint', async () => {
      // Sans ça le type mentirait : l'app continuerait de cacher la liste des
      // membres et la mention de qui a pris quoi, alors qu'ils sont deux.
      const alice = await signUp(app, 'Alice');
      const created = await auth(app, alice)
        .post('/groups')
        .send({ name: 'Chez moi', type: 'solo' })
        .expect(201);

      const bob = await signUp(app, 'Bob');
      await auth(app, bob)
        .post('/groups/join')
        .send({ inviteCode: created.body.inviteCode })
        .expect(200);

      const res = await auth(app, alice).get('/groups/me').expect(200);
      expect(res.body).toMatchObject({ type: 'roommates', memberCount: 2 });
    });

    it('laisse un groupe partagé tel quel quand on le rejoint', async () => {
      const alice = await signUp(app, 'Alice');
      const created = await auth(app, alice)
        .post('/groups')
        .send({ name: 'Le local', type: 'association' })
        .expect(201);

      const bob = await signUp(app, 'Bob');
      await auth(app, bob)
        .post('/groups/join')
        .send({ inviteCode: created.body.inviteCode })
        .expect(200);

      const res = await auth(app, alice).get('/groups/me').expect(200);
      expect(res.body.type).toBe('association');
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

  describe('PATCH /members/me — son propre profil', () => {
    it('change son nom', async () => {
      await createGroupWith(app, alice, [bob]);

      const res = await auth(app, bob)
        .patch('/members/me')
        .send({ name: 'Bobby' })
        .expect(200);

      expect(res.body).toMatchObject({ id: bob.id, name: 'Bobby' });
    });

    it('ne demande aucun mot de passe pour le seul nom', async () => {
      // Le nom ne donne accès à rien : le protéger n'ajouterait que de la
      // friction.
      await auth(app, alice)
        .patch('/members/me')
        .send({ name: 'Alicia' })
        .expect(200);
    });

    it("marche sans groupe, juste après l'inscription", async () => {
      // C'est là qu'on corrige une faute de frappe dans son email.
      const res = await auth(app, alice)
        .patch('/members/me')
        .send({
          email: 'alice.corrigee@test.dev',
          currentPassword: 'motdepasse123',
        })
        .expect(200);

      expect(res.body.email).toBe('alice.corrigee@test.dev');
    });

    it('permet de se reconnecter avec le nouvel email', async () => {
      await auth(app, alice)
        .patch('/members/me')
        .send({ email: 'nouvelle@test.dev', currentPassword: 'motdepasse123' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nouvelle@test.dev', password: 'motdepasse123' })
        .expect(200);
    });

    it('refuse un email déjà pris', async () => {
      await auth(app, alice)
        .patch('/members/me')
        .send({ email: bob.email, currentPassword: 'motdepasse123' })
        .expect(409);
    });

    it('normalise la casse', async () => {
      const res = await auth(app, alice)
        .patch('/members/me')
        .send({
          email: '  Majuscules@Test.DEV ',
          currentPassword: 'motdepasse123',
        })
        .expect(200);

      expect(res.body.email).toBe('majuscules@test.dev');
    });

    describe("le mot de passe garde l'identifiant de connexion", () => {
      it("refuse un changement d'email sans mot de passe", async () => {
        await auth(app, alice)
          .patch('/members/me')
          .send({ email: 'pirate@test.dev' })
          .expect(400);

        // L'email n'a pas bougé : l'ancien fonctionne toujours.
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: alice.email, password: 'motdepasse123' })
          .expect(200);
      });

      it('refuse un mot de passe faux', async () => {
        await auth(app, alice)
          .patch('/members/me')
          .send({ email: 'pirate@test.dev', currentPassword: 'pas-le-bon' })
          .expect(400);
      });

      it('ne déconnecte pas sur un mot de passe faux', async () => {
        // Un 401 ici terminerait la session côté client, alors que le token est
        // parfaitement valide : c'est le corps qui est en cause, pas lui.
        await auth(app, alice)
          .patch('/members/me')
          .send({ email: 'pirate@test.dev', currentPassword: 'pas-le-bon' })
          .expect(400);

        await auth(app, alice)
          .patch('/members/me')
          .send({ name: 'Toujours connectée' })
          .expect(200);
      });

      it('ne le demande pas quand l’email ne change pas', async () => {
        await auth(app, alice)
          .patch('/members/me')
          .send({ name: 'Alicia', email: alice.email })
          .expect(200);
      });
    });

    it.each([
      ['email invalide', { email: 'pas-un-email' }],
      ['nom trop court', { name: 'x' }],
    ])('rejette un %s', async (_label, body) => {
      await auth(app, alice).patch('/members/me').send(body).expect(400);
    });

    it("n'expose ni mot de passe ni push token", async () => {
      const res = await auth(app, alice)
        .patch('/members/me')
        .send({ name: 'Alicia' })
        .expect(200);

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('pushToken');
    });

    it.each([
      ['rôle', { name: 'Bobby', role: 'admin' }],
      ['groupe', { name: 'Bobby', groupId: null }],
      ['mot de passe', { password: 'nouveau123' }],
      ['identifiant', { id: 'autre' }],
    ])('refuse une tentative de changer son %s', async (_label, body) => {
      // `forbidNonWhitelisted` rejette au lieu d'ignorer : une tentative
      // d'élévation de privilège échoue bruyamment plutôt qu'en silence.
      await createGroupWith(app, alice, [bob]);

      await auth(app, bob).patch('/members/me').send(body).expect(400);
      await auth(app, bob).post('/items').send({ name: 'Pirate' }).expect(403);
    });
  });

  describe('DELETE /members/me', () => {
    it('laisse un membre partir de lui-même', async () => {
      await createGroupWith(app, alice, [bob]);

      await auth(app, bob).delete('/members/me').expect(204);

      await auth(app, bob).get('/members').expect(403);
      // L'admin, lui, reste en place.
      await auth(app, alice).get('/members').expect(200);
    });

    it("n'est pas confondue avec la suppression d'un membre par son id", async () => {
      // `me` n'est pas un UUID : déclarée après `:id`, la route se ferait
      // intercepter par ParseUUIDPipe et répondrait 400.
      await createGroupWith(app, alice, [bob]);

      await auth(app, bob).delete('/members/me').expect(204);
    });

    it('ne retient pas le dernier admin, et promeut à sa place', async () => {
      await createGroupWith(app, alice, [bob]);

      // Cette route répondait 409 : « nomme quelqu'un d'abord ». Le refus
      // tenait tant qu'on pouvait choisir de rester ; la suppression de compte
      // l'a rendu intenable, et le garder ici aurait fait dépendre le droit de
      // partir du bouton sur lequel on appuie.
      await auth(app, alice).delete('/members/me').expect(204);

      // Bob a hérité des clés : il peut créer un item, ce qu'un simple membre
      // ne peut pas faire.
      await auth(app, bob).post('/items').send({ name: 'Éponges' }).expect(201);
    });

    it('laisse partir un admin seul dans son groupe', async () => {
      await createGroupWith(app, alice);

      await auth(app, alice).delete('/members/me').expect(204);
      await auth(app, alice).get('/members').expect(403);
    });

    it('laisse partir un admin quand un autre reste en place', async () => {
      await createGroupWith(app, alice, [bob]);

      await auth(app, alice)
        .patch(`/members/${bob.id}/role`)
        .send({ role: 'admin' })
        .expect(200);
      await auth(app, alice).delete('/members/me').expect(204);

      // Bob tient le groupe : il peut désormais créer un item.
      await auth(app, bob).post('/items').send({ name: 'Éponges' }).expect(201);
    });

    it('refuse à quelqu’un sans groupe', async () => {
      await auth(app, alice).delete('/members/me').expect(403);
    });
  });

  describe('PATCH /members/:id/role', () => {
    it('promeut un membre, qui gagne les droits admin', async () => {
      await createGroupWith(app, alice, [bob]);
      await auth(app, bob).post('/items').send({ name: 'Pirate' }).expect(403);

      const res = await auth(app, alice)
        .patch(`/members/${bob.id}/role`)
        .send({ role: 'admin' })
        .expect(200);

      expect(res.body).toMatchObject({ id: bob.id, role: 'admin' });
      await auth(app, bob).post('/items').send({ name: 'Éponges' }).expect(201);
    });

    it('rétrograde un admin, qui perd les siens', async () => {
      await createGroupWith(app, alice, [bob]);
      await auth(app, alice)
        .patch(`/members/${bob.id}/role`)
        .send({ role: 'admin' })
        .expect(200);

      await auth(app, bob)
        .patch(`/members/${alice.id}/role`)
        .send({ role: 'member' })
        .expect(200);

      await auth(app, alice)
        .post('/items')
        .send({ name: 'Pirate' })
        .expect(403);
    });

    it('refuse à un simple membre', async () => {
      await createGroupWith(app, alice, [bob]);

      await auth(app, bob)
        .patch(`/members/${alice.id}/role`)
        .send({ role: 'member' })
        .expect(403);
    });

    it('refuse de changer son propre rôle', async () => {
      await createGroupWith(app, alice, [bob]);

      await auth(app, alice)
        .patch(`/members/${alice.id}/role`)
        .send({ role: 'member' })
        .expect(400);
    });

    it('rejette un rôle inconnu', async () => {
      await createGroupWith(app, alice, [bob]);

      await auth(app, alice)
        .patch(`/members/${bob.id}/role`)
        .send({ role: 'sudo' })
        .expect(400);
    });

    it("traite un membre d'un autre groupe comme introuvable", async () => {
      await createGroupWith(app, alice);
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol, [bob]);

      await auth(app, alice)
        .patch(`/members/${bob.id}/role`)
        .send({ role: 'admin' })
        .expect(404);
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
