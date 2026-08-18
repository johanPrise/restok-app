import { INestApplication } from '@nestjs/common';
import { auth, createGroupWith, signUp, TestMember } from './utils/api';
import { createE2EApp, E2EContext } from './utils/e2e-app';

describe('Items (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;
  let alice: TestMember; // admin
  let bob: TestMember; // membre

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
  });

  beforeEach(async () => {
    await ctx.reset();
    alice = await signUp(app, 'Alice');
    bob = await signUp(app, 'Bob');
    await createGroupWith(app, alice, [bob]);
  });

  afterAll(() => ctx.close());

  const createItem = async (body: Record<string, unknown>) => {
    const res = await auth(app, alice).post('/items').send(body).expect(201);
    return res.body as {
      id: string;
      status: string;
      quantity: number | null;
      targetQuantity: number | null;
    };
  };

  describe('POST /items', () => {
    it('crée un item binaire disponible', async () => {
      const item = await createItem({ name: 'Papier toilette' });

      expect(item).toMatchObject({
        status: 'available',
        trackingType: 'threshold',
        quantity: null,
      });
    });

    it('déduit le statut de la quantité initiale', async () => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 1,
        lowThreshold: 2,
      });

      expect(item.status).toBe('low');
    });

    it('crée un item vide directement en to_restock', async () => {
      // out_of_stock ne doit jamais être un état de repos, sinon l'item est
      // bloqué : aucune action ne peut plus en sortir.
      const item = await createItem({
        name: 'Éponges',
        trackingType: 'quantity',
        quantity: 0,
      });

      expect(item.status).toBe('to_restock');
      await auth(app, bob)
        .post(`/items/${item.id}/restock`)
        .send({ quantity: 5 })
        .expect(200);
    });

    it('pose une quantité de référence pour la jauge', async () => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 12,
        targetQuantity: 24,
      });

      // La jauge de l'étagère se lit quantity / targetQuantity.
      expect(item).toMatchObject({ quantity: 12, targetQuantity: 24 });
    });

    it('fait de la quantité initiale la référence par défaut', async () => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 8,
      });

      expect(item.targetQuantity).toBe(8);
    });

    it('exige une quantité initiale en mode quantité', async () => {
      await auth(app, alice)
        .post('/items')
        .send({ name: 'Café', trackingType: 'quantity' })
        .expect(400);
    });

    it('refuse à un simple membre', async () => {
      await auth(app, bob).post('/items').send({ name: 'Pirate' }).expect(403);
    });
  });

  describe('parcours binaire : prise → rupture → rachat', () => {
    it('enchaîne les trois étapes', async () => {
      const item = await createItem({ name: 'Papier toilette' });

      const pris = await auth(app, bob)
        .post(`/items/${item.id}/take`)
        .expect(200);
      expect(pris.body.status).toBe('to_restock');

      const racheté = await auth(app, alice)
        .post(`/items/${item.id}/restock`)
        .expect(200);
      expect(racheté.body.status).toBe('available');
    });

    it('refuse une prise sur un item épuisé', async () => {
      const item = await createItem({ name: 'Papier toilette' });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);

      await auth(app, bob).post(`/items/${item.id}/take`).expect(409);
    });
  });

  describe('parcours quantité : paliers', () => {
    it('descend available → low → to_restock', async () => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 3,
        lowThreshold: 2,
      });

      const étapes: [number, string][] = [];
      for (let i = 0; i < 3; i++) {
        const res = await auth(app, bob)
          .post(`/items/${item.id}/take`)
          .expect(200);
        étapes.push([res.body.quantity as number, res.body.status as string]);
      }

      expect(étapes).toEqual([
        [2, 'low'],
        [1, 'low'],
        [0, 'to_restock'],
      ]);
    });

    it('exige la quantité au rachat', async () => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 1,
      });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);

      await auth(app, bob).post(`/items/${item.id}/restock`).expect(400);
    });

    it('accepte un rachat partiel qui laisse en stock bas', async () => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 1,
        lowThreshold: 3,
      });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);

      const res = await auth(app, bob)
        .post(`/items/${item.id}/restock`)
        .send({ quantity: 2 })
        .expect(200);

      expect(res.body).toMatchObject({ quantity: 2, status: 'low' });
    });
  });

  describe('unité et conditionnement', () => {
    it("porte le nom de l'unité et la taille du paquet", async () => {
      const item = await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 12,
        unit: 'rouleau',
        packSize: 6,
      });

      expect(item).toMatchObject({ unit: 'rouleau', packSize: 6 });
    });

    it('reste en unités de base côté domaine', async () => {
      // Le conditionnement n'entre pas dans le compte : deux paquets de six,
      // c'est douze unités envoyées par l'interface.
      const item = await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 0,
        unit: 'rouleau',
        packSize: 6,
      });

      const res = await auth(app, bob)
        .post(`/items/${item.id}/restock`)
        .send({ quantity: 12 })
        .expect(200);

      expect(res.body.quantity).toBe(12);
    });

    it('rejette un paquet de moins de deux', async () => {
      await auth(app, alice)
        .post('/items')
        .send({ name: 'Papier toilette', packSize: 1 })
        .expect(400);
    });

    it('rejette une unité trop longue', async () => {
      await auth(app, alice)
        .post('/items')
        .send({ name: 'Papier toilette', unit: 'x'.repeat(21) })
        .expect(400);
    });

    it('se modifie après coup', async () => {
      const item = await createItem({ name: 'Papier toilette' });

      const res = await auth(app, alice)
        .patch(`/items/${item.id}`)
        .send({ unit: 'rouleau', packSize: 6 })
        .expect(200);

      expect(res.body).toMatchObject({ unit: 'rouleau', packSize: 6 });
    });
  });

  describe("PATCH /items/:id/format — l'étiquette du produit", () => {
    it('laisse un simple membre le préciser au retour des courses', async () => {
      // C'est une observation, pas un réglage : celui qui lit l'étiquette doit
      // pouvoir la reporter, sinon l'information ne sera jamais donnée.
      const item = await createItem({ name: 'Eau' });

      const res = await auth(app, bob)
        .patch(`/items/${item.id}/format`)
        .send({ format: '1,5 L' })
        .expect(200);

      expect(res.body.format).toBe('1,5 L');
    });

    it('reste refusé à un membre sur le reste de la configuration', async () => {
      const item = await createItem({ name: 'Eau' });

      await auth(app, bob)
        .patch(`/items/${item.id}`)
        .send({ lowThreshold: 5 })
        .expect(403);
    });

    it('efface le format avec une chaîne vide', async () => {
      const item = await createItem({ name: 'Eau', format: '1,5 L' });

      const res = await auth(app, bob)
        .patch(`/items/${item.id}/format`)
        .send({ format: '  ' })
        .expect(200);

      expect(res.body.format).toBeNull();
    });

    it('rejette un format trop long', async () => {
      const item = await createItem({ name: 'Eau' });

      await auth(app, bob)
        .patch(`/items/${item.id}/format`)
        .send({ format: 'x'.repeat(21) })
        .expect(400);
    });

    it("traite un item d'un autre groupe comme introuvable", async () => {
      const item = await createItem({ name: 'Eau' });
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol);

      await auth(app, carol)
        .patch(`/items/${item.id}/format`)
        .send({ format: '1,5 L' })
        .expect(404);
    });

    it('ne touche à rien d’autre', async () => {
      const item = await createItem({
        name: 'Eau',
        trackingType: 'quantity',
        quantity: 6,
        lowThreshold: 2,
      });

      const res = await auth(app, bob)
        .patch(`/items/${item.id}/format`)
        .send({ format: '1,5 L' })
        .expect(200);

      expect(res.body).toMatchObject({
        quantity: 6,
        lowThreshold: 2,
        status: 'available',
      });
    });
  });

  describe('quantités précisées', () => {
    it("prend le nombre d'unités demandé", async () => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 10,
        lowThreshold: 2,
      });

      const res = await auth(app, bob)
        .post(`/items/${item.id}/take`)
        .send({ quantity: 3 })
        .expect(200);

      expect(res.body).toMatchObject({ quantity: 7, status: 'available' });
    });

    it("s'arrête au stock disponible sans se plaindre", async () => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 2,
      });

      const res = await auth(app, bob)
        .post(`/items/${item.id}/take`)
        .send({ quantity: 5 })
        .expect(200);

      expect(res.body).toMatchObject({ quantity: 0, status: 'to_restock' });
    });

    it('ajoute au stock au rachat au lieu de l’écraser', async () => {
      // « J'ai racheté 6 rouleaux » alors qu'il en restait 2 → 8, pas 6.
      const item = await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 2,
        lowThreshold: 2,
      });

      const res = await auth(app, bob)
        .post(`/items/${item.id}/restock`)
        .send({ quantity: 6 })
        .expect(200);

      expect(res.body).toMatchObject({ quantity: 8, status: 'available' });
    });

    it('ignore la quantité en suivi binaire', async () => {
      const item = await createItem({ name: 'Ampoules' });

      const res = await auth(app, bob)
        .post(`/items/${item.id}/take`)
        .send({ quantity: 4 })
        .expect(200);

      expect(res.body).toMatchObject({ quantity: null, status: 'to_restock' });
    });

    it.each([
      ['zéro', 0],
      ['négative', -2],
      ['décimale', 1.5],
    ])('rejette une quantité %s', async (_label, quantity) => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 10,
      });

      await auth(app, bob)
        .post(`/items/${item.id}/take`)
        .send({ quantity })
        .expect(400);
    });

    it("consigne dans l'historique combien a bougé", async () => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 10,
        lowThreshold: 2,
      });
      await auth(app, bob)
        .post(`/items/${item.id}/take`)
        .send({ quantity: 3 })
        .expect(200);
      await auth(app, alice)
        .post(`/items/${item.id}/restock`)
        .send({ quantity: 6 })
        .expect(200);

      const res = await auth(app, bob)
        .get(`/items/${item.id}/history`)
        .expect(200);

      expect(res.body[0]).toMatchObject({
        actionType: 'restocked',
        quantity: 6,
      });
      expect(res.body[1]).toMatchObject({ actionType: 'taken', quantity: 3 });
    });

    it("laisse la quantité à null quand il n'y a rien à compter", async () => {
      const item = await createItem({ name: 'Ampoules' });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);

      const res = await auth(app, bob)
        .get(`/items/${item.id}/history`)
        .expect(200);

      expect(res.body[0].quantity).toBeNull();
    });
  });

  describe('GET /items', () => {
    it('remonte en tête ce qui demande une action', async () => {
      const pq = await createItem({ name: 'Papier toilette' });
      await createItem({ name: 'Ampoules' });
      await auth(app, bob).post(`/items/${pq.id}/take`).expect(200);

      const res = await auth(app, bob).get('/items').expect(200);
      expect(res.body[0]).toMatchObject({
        name: 'Papier toilette',
        status: 'to_restock',
      });
    });

    it('exclut les items supprimés', async () => {
      const item = await createItem({ name: 'Papier toilette' });
      await auth(app, alice).delete(`/items/${item.id}`).expect(204);

      const res = await auth(app, bob).get('/items').expect(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('dernière action sur la liste', () => {
    it("porte l'auteur et la nature de la dernière action", async () => {
      const item = await createItem({ name: 'Papier toilette' });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);

      const res = await auth(app, alice).get('/items').expect(200);
      const listed = res.body.find((i: { id: string }) => i.id === item.id);

      expect(listed.lastAction).toMatchObject({
        actionType: 'taken',
        memberName: 'Bob',
      });
      expect(Date.parse(listed.lastAction.at as string)).not.toBeNaN();
    });

    it('retient la plus récente, pas la première', async () => {
      const item = await createItem({ name: 'Papier toilette' });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await auth(app, alice).post(`/items/${item.id}/restock`).expect(200);

      const res = await auth(app, alice).get('/items').expect(200);
      const listed = res.body.find((i: { id: string }) => i.id === item.id);

      expect(listed.lastAction).toMatchObject({
        actionType: 'restocked',
        memberName: 'Alice',
      });
    });

    it("vaut null tant que rien ne s'est passé", async () => {
      const item = await createItem({ name: 'Ampoules' });

      const res = await auth(app, alice).get('/items').expect(200);
      const listed = res.body.find((i: { id: string }) => i.id === item.id);

      expect(listed.lastAction).toBeNull();
    });

    it('ne mélange pas les items entre eux', async () => {
      const pq = await createItem({ name: 'Papier toilette' });
      const cafe = await createItem({ name: 'Café' });
      await auth(app, bob).post(`/items/${pq.id}/take`).expect(200);

      const res = await auth(app, alice).get('/items').expect(200);
      const rows = res.body as { id: string; lastAction: unknown }[];

      expect(rows.find((i) => i.id === pq.id)?.lastAction).not.toBeNull();
      expect(rows.find((i) => i.id === cafe.id)?.lastAction).toBeNull();
    });
  });

  describe('GET /items/:id/history', () => {
    it("journalise chaque action avec son auteur, plus récente d'abord", async () => {
      const item = await createItem({ name: 'Papier toilette' });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await auth(app, alice).post(`/items/${item.id}/restock`).expect(200);

      const res = await auth(app, bob)
        .get(`/items/${item.id}/history`)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({
        actionType: 'restocked',
        member: { name: 'Alice' },
      });
      expect(res.body[1]).toMatchObject({
        actionType: 'taken',
        member: { name: 'Bob' },
      });
    });

    it("n'enregistre rien quand l'action est refusée", async () => {
      const item = await createItem({ name: 'Papier toilette' });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await auth(app, bob).post(`/items/${item.id}/take`).expect(409);

      const res = await auth(app, bob)
        .get(`/items/${item.id}/history`)
        .expect(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('PATCH /items/:id', () => {
    it('bascule en mode quantité et recalcule le statut', async () => {
      const item = await createItem({ name: 'Café' });

      const res = await auth(app, alice)
        .patch(`/items/${item.id}`)
        .send({ trackingType: 'quantity', quantity: 1, lowThreshold: 3 })
        .expect(200);

      expect(res.body).toMatchObject({ quantity: 1, status: 'low' });
    });

    it('vide la quantité au retour en binaire', async () => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 1,
        lowThreshold: 3,
      });

      const res = await auth(app, alice)
        .patch(`/items/${item.id}`)
        .send({ trackingType: 'threshold' })
        .expect(200);

      // `low` n'existe pas en suivi binaire.
      expect(res.body).toMatchObject({ quantity: null, status: 'available' });
    });

    it('refuse à un simple membre', async () => {
      const item = await createItem({ name: 'Café' });

      await auth(app, bob)
        .patch(`/items/${item.id}`)
        .send({ name: 'Pirate' })
        .expect(403);
    });
  });

  describe('isolation entre groupes', () => {
    let carol: TestMember;
    let itemId: string;

    beforeEach(async () => {
      const item = await createItem({ name: 'Papier toilette' });
      itemId = item.id;
      carol = await signUp(app, 'Carol');
      // Carol est admin de SON groupe : les guards passent, l'item pas.
      await createGroupWith(app, carol);
    });

    it.each([
      ['prise', (id: string) => auth(app, carol).post(`/items/${id}/take`)],
      ['rachat', (id: string) => auth(app, carol).post(`/items/${id}/restock`)],
      [
        'historique',
        (id: string) => auth(app, carol).get(`/items/${id}/history`),
      ],
      ['suppression', (id: string) => auth(app, carol).delete(`/items/${id}`)],
    ])("%s d'un item d'un autre groupe renvoie 404", async (_label, call) => {
      await call(itemId).expect(404);
    });

    it('ne voit pas les items des autres', async () => {
      const res = await auth(app, carol).get('/items').expect(200);
      expect(res.body).toHaveLength(0);
    });
  });
});
