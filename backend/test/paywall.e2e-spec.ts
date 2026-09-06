import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { auth, createGroupWith, signUp, TestMember } from './utils/api';
import { createE2EApp, E2EContext } from './utils/e2e-app';

/**
 * Les quatre verrous du palier gratuit, contre une vraie base.
 *
 * Ce que les tests unitaires ne peuvent pas montrer : que le `count` des items
 * ignore réellement les soft-deletés, que le registre reste **lisible** quand
 * son export est fermé — c'est un query builder brut, qu'un faux ne reproduit
 * qu'en apparence — et que débloquer un groupe lève bien les quatre d'un coup.
 */
describe('Palier gratuit (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;
  let dataSource: DataSource;
  let alice: TestMember;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await ctx.reset();
    alice = await signUp(app, 'Alice');
  });

  afterAll(() => ctx.close());

  /** Débloque le groupe comme le fera le webhook : un achat, puis la colonne. */
  async function unlock(groupId: string): Promise<void> {
    const [purchase] = await dataSource.query(
      `INSERT INTO purchase (member_id, product_id, store, store_transaction_id, purchased_at)
       VALUES ($1, 'restock_lifetime', 'test_store', $2, now())
       RETURNING id`,
      [alice.id, `tx-${Date.now()}-${Math.random()}`],
    );

    await dataSource.query(
      'UPDATE "group" SET unlocked_by_purchase_id = $1 WHERE id = $2',
      [purchase.id, groupId],
    );
  }

  /** Remplit l'étagère jusqu'au nombre voulu. */
  async function fillShelf(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await auth(app, alice)
        .post('/items')
        .send({ name: `Article ${i}` })
        .expect(201);
    }
  }

  describe("le plafond de l'étagère", () => {
    it('laisse créer les vingt-cinq premiers', async () => {
      await createGroupWith(app, alice);
      await fillShelf(25);

      const items = await auth(app, alice).get('/items').expect(200);
      expect(items.body).toHaveLength(25);
    });

    it('refuse le vingt-sixième', async () => {
      await createGroupWith(app, alice);
      await fillShelf(25);

      const refus = await auth(app, alice)
        .post('/items')
        .send({ name: 'De trop' })
        .expect(409);

      expect(refus.body.code).toBe('free_item_limit_reached');
    });

    it('bloque l’ajout, jamais la lecture', async () => {
      await createGroupWith(app, alice);
      await fillShelf(25);
      await auth(app, alice)
        .post('/items')
        .send({ name: 'De trop' })
        .expect(409);

      // Au plafond, tout ce qui existe reste visible et utilisable. Masquer des
      // items déjà saisis ferait de la limite une amputation.
      const items = await auth(app, alice).get('/items').expect(200);
      expect(items.body).toHaveLength(25);

      const first = items.body[0] as { id: string };
      await auth(app, alice).post(`/items/${first.id}/take`).expect(200);
    });

    it('libère une place quand on retire un item', async () => {
      await createGroupWith(app, alice);
      await fillShelf(25);

      const items = await auth(app, alice).get('/items').expect(200);
      const victime = (items.body as { id: string }[])[0];
      await auth(app, alice).delete(`/items/${victime.id}`).expect(204);

      // Le plafond compte ce qu'on suit, pas ce qu'on a suivi : le soft-delete
      // ne doit pas continuer d'occuper une place.
      await auth(app, alice)
        .post('/items')
        .send({ name: 'Le suivant' })
        .expect(201);
    });

    it('disparaît pour un groupe qui a payé', async () => {
      const group = await createGroupWith(app, alice);
      await fillShelf(25);
      await unlock(group.id);

      await auth(app, alice)
        .post('/items')
        .send({ name: 'Le vingt-sixième' })
        .expect(201);
    });
  });

  describe('le plafond de membres', () => {
    it('refuse le septième', async () => {
      const autres = [];
      for (let i = 0; i < 6; i++) autres.push(await signUp(app, `Membre${i}`));

      // Alice plus cinq : six personnes, le groupe est plein.
      const group = await createGroupWith(app, alice, autres.slice(0, 5));

      const refus = await auth(app, autres[5])
        .post('/groups/join')
        .send({ inviteCode: group.inviteCode })
        .expect(409);

      expect(refus.body.code).toBe('free_member_limit_reached');
    });

    it('disparaît pour un groupe qui a payé', async () => {
      const autres = [];
      for (let i = 0; i < 6; i++) autres.push(await signUp(app, `Membre${i}`));
      const group = await createGroupWith(app, alice, autres.slice(0, 5));

      await unlock(group.id);

      await auth(app, autres[5])
        .post('/groups/join')
        .send({ inviteCode: group.inviteCode })
        .expect(200);
    });
  });

  describe("l'export du registre", () => {
    it('est refusé au palier gratuit', async () => {
      await createGroupWith(app, alice);

      const refus = await auth(app, alice).get('/history/export').expect(409);
      expect(refus.body.code).toBe('export_requires_unlock');
    });

    it('laisse le registre parfaitement lisible', async () => {
      await createGroupWith(app, alice);
      const item = await auth(app, alice)
        .post('/items')
        .send({ name: 'Café' })
        .expect(201);
      await auth(app, alice)
        .post(`/items/${item.body.id as string}/take`)
        .expect(200);

      // Lire est la fonction de preuve, et elle reste gratuite : un registre
      // que seul le payeur pourrait lire ne prouverait rien aux autres.
      const journal = await auth(app, alice).get('/history').expect(200);
      expect(journal.body.entries).toHaveLength(1);
      expect(journal.body.entries[0]).toMatchObject({ itemName: 'Café' });
    });

    it('s’ouvre pour un groupe qui a payé', async () => {
      const group = await createGroupWith(app, alice);
      await unlock(group.id);

      await auth(app, alice).get('/history/export').expect(200);
    });
  });

  describe('le plafond de recettes', () => {
    /** Enregistre `count` recettes à la main, sans passer par le catalogue. */
    async function keepRecipes(count: number): Promise<void> {
      for (let i = 0; i < count; i++) {
        await auth(app, alice)
          .post('/recipes')
          .send({ name: `Recette ${i}` })
          .expect(201);
      }
    }

    it('refuse la onzième', async () => {
      await createGroupWith(app, alice);
      await keepRecipes(10);

      const refus = await auth(app, alice)
        .post('/recipes')
        .send({ name: 'De trop' })
        .expect(409);

      expect(refus.body.code).toBe('free_recipe_limit_reached');
    });

    it('disparaît pour un groupe qui a payé', async () => {
      const group = await createGroupWith(app, alice);
      await keepRecipes(10);
      await unlock(group.id);

      await auth(app, alice)
        .post('/recipes')
        .send({ name: 'La onzième' })
        .expect(201);
    });
  });

  describe('le drapeau rendu à l’app', () => {
    it('dit « verrouillé » par défaut', async () => {
      await createGroupWith(app, alice);

      const group = await auth(app, alice).get('/groups/me').expect(200);
      expect(group.body.isUnlocked).toBe(false);
      // Le client n'a rien à faire d'une clé étrangère, et ne doit pas pouvoir
      // déduire qui a payé.
      expect(group.body).not.toHaveProperty('unlockedByPurchaseId');
    });

    it('dit « débloqué » après un achat', async () => {
      const created = await createGroupWith(app, alice);
      await unlock(created.id);

      const group = await auth(app, alice).get('/groups/me').expect(200);
      expect(group.body.isUnlocked).toBe(true);
    });
  });
});
