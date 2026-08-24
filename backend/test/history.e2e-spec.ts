import { INestApplication } from '@nestjs/common';
import { auth, createGroupWith, signUp, TestMember } from './utils/api';
import { createE2EApp, E2EContext } from './utils/e2e-app';

describe('Journal du groupe (e2e)', () => {
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

  const journal = (member: TestMember, query = '') =>
    auth(app, member).get(`/history${query}`);

  it('rassemble ce que la fiche d’un item ne montrait qu’une par une', async () => {
    // La donnée existait depuis le début ; il fallait ouvrir chaque item pour
    // la lire, et la recoudre à la main.
    const cafe = await createItem({
      name: 'Café',
      trackingType: 'quantity',
      quantity: 10,
    });
    const papier = await createItem({ name: 'Papier toilette' });

    await auth(app, bob)
      .post(`/items/${cafe.id}/take`)
      .send({ quantity: 3 })
      .expect(200);
    await auth(app, alice).post(`/items/${papier.id}/take`).expect(200);

    const res = await journal(bob).expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body.map((e: { itemName: string }) => e.itemName)).toEqual([
      'Papier toilette',
      'Café',
    ]);
  });

  it('nomme l’item, l’auteur, l’action et la quantité', async () => {
    const cafe = await createItem({
      name: 'Café',
      trackingType: 'quantity',
      quantity: 10,
    });
    await auth(app, bob)
      .post(`/items/${cafe.id}/take`)
      .send({ quantity: 3 })
      .expect(200);

    const entries = await journal(bob).expect(200);

    expect(entries.body[0]).toMatchObject({
      itemName: 'Café',
      memberName: 'Bob',
      actionType: 'taken',
      quantity: 3,
    });
  });

  it('met le plus récent en tête — un journal se lit à l’envers', async () => {
    const cafe = await createItem({ name: 'Café' });
    await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);
    await auth(app, bob).post(`/items/${cafe.id}/restock`).expect(200);

    const res = await journal(bob).expect(200);

    expect(res.body[0].actionType).toBe('restocked');
    expect(res.body[1].actionType).toBe('taken');
  });

  it('répond à « qu’a sorti untel »', async () => {
    // La première question d'une association.
    const cafe = await createItem({ name: 'Café' });
    await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);
    await auth(app, bob).post(`/items/${cafe.id}/restock`).expect(200);

    const res = await journal(bob, `?memberId=${bob.id}`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].memberName).toBe('Bob');
  });

  it('borne la période', async () => {
    const cafe = await createItem({ name: 'Café' });
    await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);

    const demain = new Date(Date.now() + 86_400_000).toISOString();
    const res = await journal(bob, `?since=${demain}`).expect(200);

    expect(res.body).toEqual([]);
  });

  it('garde la trace d’un item supprimé', async () => {
    // Ce qui a eu lieu a eu lieu : le ménage de l'étagère n'efface pas
    // l'année passée, et c'est exactement ce qu'une association attend.
    const cafe = await createItem({ name: 'Café' });
    await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);
    await auth(app, alice).delete(`/items/${cafe.id}`).expect(204);

    const res = await journal(bob).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].itemName).toBe('Café');
  });

  it('ne montre pas le journal d’un autre groupe', async () => {
    const cafe = await createItem({ name: 'Café' });
    await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);

    const carol = await signUp(app, 'Carol');
    await createGroupWith(app, carol);

    const res = await journal(carol).expect(200);
    expect(res.body).toEqual([]);
  });

  it('est ouvert à un simple membre — un registre illisible ne prouve rien', async () => {
    await journal(bob).expect(200);
  });

  it('plafonne ce qu’on peut demander d’un coup', async () => {
    await journal(bob, '?limit=500').expect(400);
  });

  it('refuse le journal à quelqu’un sans groupe', async () => {
    const dave = await signUp(app, 'Dave');

    await journal(dave).expect(403);
  });
});
