import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { auth, createGroupWith, signUp, TestMember } from './utils/api';
import { createE2EApp, E2EContext } from './utils/e2e-app';

/**
 * La suppression de compte, contre une vraie base.
 *
 * Trois choses ne se vérifient qu'ici : que le journal survit anonyme à son
 * auteur — ce sont des `LEFT JOIN` filtrés sur `deleted_at`, qu'aucun faux ne
 * reproduit — que la succession s'appuie sur un vrai `ORDER BY`, et que
 * l'unicité de l'email ne transforme pas un départ en bannissement.
 */
describe('Suppression de compte (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;
  let dataSource: DataSource;
  let alice: TestMember;
  let bob: TestMember;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await ctx.reset();
    alice = await signUp(app, 'Alice');
    bob = await signUp(app, 'Bob');
  });

  afterAll(() => ctx.close());

  const deleteAccount = (member: TestMember) =>
    auth(app, member).delete('/members/me/account');

  describe('le compte lui-même', () => {
    it('supprime le compte et tue la session', async () => {
      await deleteAccount(alice).expect(204);

      // `JwtStrategy` relit le membre à chaque requête : un compte supprimé
      // n'a plus de session, sans qu'on ait à révoquer quoi que ce soit.
      await auth(app, alice).get('/members').expect(401);
    });

    it('marche sans groupe — on doit pouvoir défaire une inscription', async () => {
      // Exiger un groupe enfermerait dehors ceux qui n'ont fait que s'inscrire.
      await deleteAccount(alice).expect(204);
    });

    it('interdit de se reconnecter', async () => {
      await deleteAccount(alice).expect(204);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: alice.email, password: 'motdepasse123' })
        .expect(401);
    });

    it('ne transforme pas un départ en bannissement', async () => {
      await deleteAccount(alice).expect(204);

      // L'email est unique en base : sans brouillage, la même adresse serait
      // condamnée à jamais.
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Alice',
          email: alice.email,
          password: 'motdepasse123',
        })
        .expect(201);
    });

    it('ne garde plus rien d’identifiant en base', async () => {
      await deleteAccount(alice).expect(204);

      // La ligne doit survivre — `action_history` s'y accroche — donc c'est son
      // contenu qu'on vérifie. Sans ce nettoyage, « supprimer » n'aurait été
      // qu'une mise à l'écart : le nom serait resté indéfiniment.
      const [row] = await dataSource.query(
        'SELECT name, email, password FROM member WHERE id = $1',
        [alice.id],
      );

      expect(row.name).not.toBe('Alice');
      expect(row.email).not.toBe(alice.email);
      expect(row.password).toBe('');
    });

    it('coupe les sessions longues', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: bob.email, password: 'motdepasse123' })
        .expect(200);

      await deleteAccount(bob).expect(204);

      // Sinon un refresh token survivrait deux mois à un compte disparu.
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: res.body.refreshToken as string })
        .expect(401);
    });
  });

  describe('le journal', () => {
    it('garde les lignes, et leur retire seulement leur auteur', async () => {
      await createGroupWith(app, alice, [bob]);
      const item = await auth(app, alice)
        .post('/items')
        .send({ name: 'Café' })
        .expect(201);
      await auth(app, bob)
        .post(`/items/${item.body.id as string}/take`)
        .expect(200);

      await deleteAccount(bob).expect(204);

      const journal = await auth(app, alice).get('/history').expect(200);

      // Effacer la ligne aurait crevé le registre des autres, qui s'en servent
      // pour savoir qui a pris quoi ; la garder nommée aurait conservé une
      // donnée personnelle après suppression.
      expect(journal.body.entries).toHaveLength(1);
      expect(journal.body.entries[0]).toMatchObject({
        itemName: 'Café',
        memberName: null,
      });
    });

    it('retire aussi le nom sous le tag de l’étagère', async () => {
      await createGroupWith(app, alice, [bob]);
      const item = await auth(app, alice)
        .post('/items')
        .send({ name: 'Café' })
        .expect(201);
      await auth(app, bob)
        .post(`/items/${item.body.id as string}/take`)
        .expect(200);

      await deleteAccount(bob).expect(204);

      const items = await auth(app, alice).get('/items').expect(200);
      expect(items.body[0].lastAction).toMatchObject({ memberName: null });
    });
  });

  describe('la succession', () => {
    it('promeut quelqu’un quand le dernier admin s’en va', async () => {
      await createGroupWith(app, alice, [bob]);

      await deleteAccount(alice).expect(204);

      // Bob tient le groupe : créer un item est réservé aux admins.
      await auth(app, bob).post('/items').send({ name: 'Éponges' }).expect(201);
    });

    it('choisit le membre présent depuis le plus longtemps', async () => {
      const carla = await signUp(app, 'Carla');
      await createGroupWith(app, alice, [bob, carla]);

      await deleteAccount(alice).expect(204);

      // Bob a rejoint avant Carla : c'est la règle de WhatsApp, l'ordre
      // d'arrivée dans le groupe.
      await auth(app, bob).post('/items').send({ name: 'Éponges' }).expect(201);
      await auth(app, carla)
        .post('/items')
        .send({ name: 'Pirate' })
        .expect(403);
    });

    it('ne promeut personne tant qu’il reste un admin', async () => {
      const carla = await signUp(app, 'Carla');
      await createGroupWith(app, alice, [bob, carla]);
      await auth(app, alice)
        .patch(`/members/${bob.id}/role`)
        .send({ role: 'admin' })
        .expect(200);

      await deleteAccount(alice).expect(204);

      // Carla reste simple membre : il y avait déjà quelqu'un aux commandes,
      // et la succession ne se déclenche qu'à défaut.
      await auth(app, carla)
        .post('/items')
        .send({ name: 'Pirate' })
        .expect(403);
    });
  });

  describe('le groupe laissé derrière', () => {
    it('part avec le dernier membre', async () => {
      await createGroupWith(app, alice);

      await deleteAccount(alice).expect(204);

      // Un groupe vide que plus personne ne peut ni rouvrir ni supprimer
      // garderait son nom et ses items indéfiniment.
      const restants = await dataSource.query(
        'SELECT id FROM "group" WHERE deleted_at IS NULL',
      );
      expect(restants).toHaveLength(0);
    });

    it('survit tant qu’il reste quelqu’un', async () => {
      await createGroupWith(app, alice, [bob]);

      await deleteAccount(alice).expect(204);

      await auth(app, bob).get('/groups/me').expect(200);
    });
  });
});
