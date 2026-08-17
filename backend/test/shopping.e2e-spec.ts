import { INestApplication } from '@nestjs/common';
import { auth, createGroupWith, signUp, TestMember } from './utils/api';
import { createE2EApp, E2EContext } from './utils/e2e-app';

describe('Shopping (e2e)', () => {
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
    return res.body as { id: string; name: string };
  };

  const addLine = (member: TestMember, body: Record<string, unknown>) =>
    auth(app, member).post('/shopping').send(body);

  describe('POST /shopping', () => {
    it("rattache une ligne à un item de l'étagère", async () => {
      const item = await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 2,
        unit: 'rouleau',
        packSize: 6,
        format: '×6',
      });

      const res = await addLine(bob, { itemId: item.id, quantity: 12 }).expect(
        201,
      );

      expect(res.body).toMatchObject({
        itemId: item.id,
        name: 'Papier toilette',
        quantity: 12,
        checked: false,
        // Recopiés de l'item : au rayon, c'est ce qui dit quoi prendre.
        unit: 'rouleau',
        packSize: 6,
        format: '×6',
        trackingType: 'quantity',
      });
    });

    it('accepte une ligne libre pour ce que le groupe ne suit pas', async () => {
      const res = await addLine(bob, { label: 'Pain' }).expect(201);

      expect(res.body).toMatchObject({
        itemId: null,
        name: 'Pain',
        quantity: null,
        // Une ligne libre ne suit rien : préciser une quantité y reste
        // pourtant permis, c'est l'item qui déciderait du contraire.
        trackingType: null,
      });
    });

    it('refuse une ligne qui porte les deux', async () => {
      const item = await createItem({ name: 'Café' });

      await addLine(bob, { itemId: item.id, label: 'Café' }).expect(400);
    });

    it('refuse une ligne qui ne porte ni l’un ni l’autre', async () => {
      await addLine(bob, { quantity: 2 }).expect(400);
    });

    it('refuse deux fois le même item — la base tranche les doublons', async () => {
      // Le §12 demande une gestion des doublons : c'est la contrainte
      // d'unicité qui la porte, pas une comparaison de chaînes.
      const item = await createItem({ name: 'Café' });
      await addLine(alice, { itemId: item.id }).expect(201);

      await addLine(bob, { itemId: item.id }).expect(409);
    });

    it('laisse plusieurs lignes libres coexister', async () => {
      // PostgreSQL considère deux `NULL` comme distincts : les lignes libres
      // échappent naturellement à la contrainte.
      await addLine(bob, { label: 'Pain' }).expect(201);
      await addLine(bob, { label: 'Fromage' }).expect(201);

      const res = await auth(app, bob).get('/shopping').expect(200);
      expect(res.body).toHaveLength(2);
    });

    it("traite un item d'un autre groupe comme introuvable", async () => {
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol);
      const item = await createItem({ name: 'Café' });

      await addLine(carol, { itemId: item.id }).expect(404);
    });

    it('est ouverte à un simple membre — faire les courses n’est pas administrer', async () => {
      await addLine(bob, { label: 'Pain' }).expect(201);
    });

    it.each([
      ['un label trop court', { label: 'x' }],
      ['une quantité nulle', { label: 'Pain', quantity: 0 }],
      ['un identifiant qui n’est pas un UUID', { itemId: 'pas-un-uuid' }],
    ])('rejette %s', async (_label, body) => {
      await addLine(bob, body).expect(400);
    });
  });

  describe('GET /shopping', () => {
    it('fait remonter ce qui reste à prendre', async () => {
      const a = await addLine(bob, { label: 'Pain' }).expect(201);
      await addLine(bob, { label: 'Fromage' }).expect(201);
      await auth(app, bob)
        .patch(`/shopping/${a.body.id}`)
        .send({ checked: true })
        .expect(200);

      const res = await auth(app, bob).get('/shopping').expect(200);
      expect(res.body.map((l: { name: string }) => l.name)).toEqual([
        'Fromage',
        'Pain',
      ]);
    });

    it('suit le renommage de son item', async () => {
      // Le nom se lit sur l'item : le recopier le figerait à l'ajout.
      const item = await createItem({ name: 'Papier toilette' });
      await addLine(bob, { itemId: item.id }).expect(201);

      await auth(app, alice)
        .patch(`/items/${item.id}`)
        .send({ name: 'PQ' })
        .expect(200);

      const res = await auth(app, bob).get('/shopping').expect(200);
      expect(res.body[0].name).toBe('PQ');
    });

    it("ne montre pas la liste d'un autre groupe", async () => {
      await addLine(bob, { label: 'Pain' }).expect(201);
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol);

      const res = await auth(app, carol).get('/shopping').expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('PATCH /shopping/:id', () => {
    it('coche en nommant qui l’a fait', async () => {
      const line = await addLine(alice, { label: 'Pain' }).expect(201);

      const res = await auth(app, bob)
        .patch(`/shopping/${line.body.id}`)
        .send({ checked: true })
        .expect(200);

      expect(res.body).toMatchObject({ checked: true, checkedBy: 'Bob' });
      expect(Date.parse(res.body.checkedAt as string)).not.toBeNaN();
    });

    it('efface l’auteur quand on se ravise', async () => {
      const line = await addLine(alice, { label: 'Pain' }).expect(201);
      await auth(app, bob)
        .patch(`/shopping/${line.body.id}`)
        .send({ checked: true })
        .expect(200);

      const res = await auth(app, bob)
        .patch(`/shopping/${line.body.id}`)
        .send({ checked: false })
        .expect(200);

      expect(res.body).toMatchObject({
        checked: false,
        checkedBy: null,
        checkedAt: null,
      });
    });

    it('corrige ce qu’on prend vraiment', async () => {
      // On partait pour six, le paquet de douze était en promotion.
      const item = await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 2,
      });
      const line = await addLine(bob, { itemId: item.id, quantity: 6 }).expect(
        201,
      );

      const res = await auth(app, bob)
        .patch(`/shopping/${line.body.id}`)
        .send({ quantity: 12 })
        .expect(200);

      expect(res.body.quantity).toBe(12);
    });

    it('garde l’auteur quand on ne touche qu’à la quantité', async () => {
      const line = await addLine(alice, { label: 'Pain' }).expect(201);
      await auth(app, bob)
        .patch(`/shopping/${line.body.id}`)
        .send({ checked: true })
        .expect(200);

      const res = await auth(app, alice)
        .patch(`/shopping/${line.body.id}`)
        .send({ quantity: 2 })
        .expect(200);

      expect(res.body).toMatchObject({ checked: true, checkedBy: 'Bob' });
    });

    it("traite une ligne d'un autre groupe comme introuvable", async () => {
      const line = await addLine(bob, { label: 'Pain' }).expect(201);
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol);

      await auth(app, carol)
        .patch(`/shopping/${line.body.id}`)
        .send({ checked: true })
        .expect(404);
    });
  });

  describe('DELETE /shopping/:id', () => {
    it('retire la ligne', async () => {
      const line = await addLine(bob, { label: 'Pain' }).expect(201);

      await auth(app, bob).delete(`/shopping/${line.body.id}`).expect(204);

      const res = await auth(app, bob).get('/shopping').expect(200);
      expect(res.body).toEqual([]);
    });

    it('libère la place pour rajouter le même item', async () => {
      const item = await createItem({ name: 'Café' });
      const line = await addLine(bob, { itemId: item.id }).expect(201);
      await auth(app, bob).delete(`/shopping/${line.body.id}`).expect(204);

      await addLine(bob, { itemId: item.id }).expect(201);
    });

    it("traite une ligne d'un autre groupe comme introuvable", async () => {
      const line = await addLine(bob, { label: 'Pain' }).expect(201);
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol);

      await auth(app, carol).delete(`/shopping/${line.body.id}`).expect(404);
    });
  });

  describe('POST /shopping/refill', () => {
    const refill = (member: TestMember) =>
      auth(app, member).post('/shopping/refill');

    it("verse ce que l'étagère réclame, pré-rempli pour refaire le plein", async () => {
      const item = await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 0,
        targetQuantity: 6,
      });

      const res = await refill(bob).expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        itemId: item.id,
        name: 'Papier toilette',
        quantity: 6,
        checked: false,
      });
    });

    it('arrondit au paquet — on n’achète pas un tiers de lot', async () => {
      await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 0,
        targetQuantity: 10,
        packSize: 6,
      });

      const res = await refill(bob).expect(200);

      expect(res.body[0].quantity).toBe(12);
    });

    it('emporte aussi les stocks bas — on va au magasin avant la rupture', async () => {
      await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 1,
        lowThreshold: 2,
        targetQuantity: 5,
      });

      const res = await refill(bob).expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].quantity).toBe(4);
    });

    it('laisse en paix ce qui ne manque pas', async () => {
      await createItem({
        name: 'Riz',
        trackingType: 'quantity',
        quantity: 10,
        targetQuantity: 10,
      });

      const res = await refill(bob).expect(200);

      expect(res.body).toEqual([]);
    });

    it('verse un item binaire épuisé sans quantité — il n’y a rien à compter', async () => {
      const item = await createItem({ name: 'Éponge' });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);

      const res = await refill(bob).expect(200);

      expect(res.body[0]).toMatchObject({ name: 'Éponge', quantity: null });
    });

    it('ne doublonne pas quand on verse deux fois', async () => {
      // Deux personnes qui appuient sur « remplir » ne remplissent pas deux
      // listes : on verse ce qui manque, on ne signale pas ce qui est déjà là.
      await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 0,
        targetQuantity: 6,
      });
      await refill(alice).expect(200);

      const res = await refill(bob).expect(200);

      expect(res.body).toHaveLength(1);
    });

    it('ne touche pas à une quantité déjà corrigée à la main', async () => {
      const item = await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 0,
        targetQuantity: 6,
      });
      await addLine(bob, { itemId: item.id, quantity: 24 }).expect(201);

      const res = await refill(bob).expect(200);

      expect(res.body[0].quantity).toBe(24);
    });

    it("ne verse pas l'étagère d'un autre groupe", async () => {
      await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 0,
      });
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol);

      const res = await refill(carol).expect(200);

      expect(res.body).toEqual([]);
    });

    it('est ouverte à un simple membre', async () => {
      await refill(bob).expect(200);
    });
  });

  describe('POST /shopping/complete', () => {
    const complete = (member: TestMember) =>
      auth(app, member).post('/shopping/complete');

    const check = (member: TestMember, lineId: string) =>
      auth(app, member).patch(`/shopping/${lineId}`).send({ checked: true });

    interface ItemView {
      id: string;
      quantity: number | null;
      status: string;
    }

    const readItem = async (itemId: string): Promise<ItemView> => {
      const res = await auth(app, alice).get('/items').expect(200);
      const item = (res.body as ItemView[]).find((i) => i.id === itemId);
      if (!item) throw new Error(`Item ${itemId} introuvable sur l'étagère`);

      return item;
    };

    it('transforme les lignes cochées en rachats', async () => {
      const item = await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 0,
        targetQuantity: 6,
      });
      const lines = await auth(app, bob).post('/shopping/refill').expect(200);
      await check(bob, lines.body[0].id).expect(200);

      const res = await complete(bob).expect(200);

      expect(res.body).toEqual([]);
      expect(await readItem(item.id)).toMatchObject({
        quantity: 6,
        status: 'available',
      });
    });

    it('fait entrer ce qu’on a vraiment pris, pas ce qui était prévu', async () => {
      // Le paquet de douze était en promotion.
      const item = await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 0,
        targetQuantity: 6,
      });
      const line = await addLine(bob, { itemId: item.id, quantity: 12 });
      await check(bob, line.body.id).expect(200);

      await complete(bob).expect(200);

      expect((await readItem(item.id)).quantity).toBe(12);
    });

    it('retombe sur le pré-remplissage quand la ligne n’a pas de quantité', async () => {
      // La façade exige une quantité en suivi quantité : sans ce repli, valider
      // les courses échouerait sur une ligne ajoutée à la va-vite.
      const item = await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 0,
        targetQuantity: 6,
      });
      const line = await addLine(bob, { itemId: item.id }).expect(201);
      await check(bob, line.body.id).expect(200);

      await complete(bob).expect(200);

      expect((await readItem(item.id)).quantity).toBe(6);
    });

    it('remet un item binaire en rayon', async () => {
      const item = await createItem({ name: 'Éponge' });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      const lines = await auth(app, bob).post('/shopping/refill').expect(200);
      await check(bob, lines.body[0].id).expect(200);

      await complete(bob).expect(200);

      expect(await readItem(item.id)).toMatchObject({ status: 'available' });
    });

    it('laisse sur la liste ce qu’on n’a pas trouvé', async () => {
      const trouve = await addLine(bob, { label: 'Pain' }).expect(201);
      await addLine(bob, { label: 'Fromage' }).expect(201);
      await check(bob, trouve.body.id).expect(200);

      const res = await complete(bob).expect(200);

      expect(res.body.map((l: { name: string }) => l.name)).toEqual([
        'Fromage',
      ]);
    });

    it('fait disparaître une ligne libre sans rien racheter', async () => {
      const line = await addLine(bob, { label: 'Pain' }).expect(201);
      await check(bob, line.body.id).expect(200);

      const res = await complete(bob).expect(200);

      expect(res.body).toEqual([]);
    });

    it('écrit le rachat dans l’historique, au nom de qui a fait les courses', async () => {
      // Le rachat passe par la façade : il ne contourne ni la state machine ni
      // le journal.
      const item = await createItem({
        name: 'Papier toilette',
        trackingType: 'quantity',
        quantity: 0,
        targetQuantity: 6,
      });
      const lines = await auth(app, bob).post('/shopping/refill').expect(200);
      await check(bob, lines.body[0].id).expect(200);
      await complete(bob).expect(200);

      const res = await auth(app, alice)
        .get(`/items/${item.id}/history`)
        .expect(200);

      expect(res.body[0]).toMatchObject({
        actionType: 'restocked',
        quantity: 6,
        member: { name: 'Bob' },
      });
    });

    it('ne fait rien quand rien n’est coché', async () => {
      await addLine(bob, { label: 'Pain' }).expect(201);

      const res = await complete(bob).expect(200);

      expect(res.body).toHaveLength(1);
    });

    it("ne valide pas la liste d'un autre groupe", async () => {
      const line = await addLine(bob, { label: 'Pain' }).expect(201);
      await check(bob, line.body.id).expect(200);
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol);

      await complete(carol).expect(200);

      const res = await auth(app, bob).get('/shopping').expect(200);
      expect(res.body).toHaveLength(1);
    });

    it('est ouverte à un simple membre — celui qui rentre des courses est celui qui sait', async () => {
      await complete(bob).expect(200);
    });
  });

  describe("l'item supprimé emporte sa ligne", () => {
    it('retire la ligne quand son item disparaît', async () => {
      // Garder « racheter du papier toilette » pour un item qui n'existe plus
      // n'aiderait personne.
      const item = await createItem({ name: 'Papier toilette' });
      await addLine(bob, { itemId: item.id }).expect(201);

      await auth(app, alice).delete(`/items/${item.id}`).expect(204);

      const res = await auth(app, bob).get('/shopping').expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('accès', () => {
    it.each([
      ['la liste', (t: TestMember) => auth(app, t).get('/shopping')],
      [
        'un ajout',
        (t: TestMember) => auth(app, t).post('/shopping').send({ label: 'X' }),
      ],
    ])('refuse %s à quelqu’un sans groupe', async (_label, call) => {
      const dave = await signUp(app, 'Dave');

      await call(dave).expect(403);
    });
  });
});
