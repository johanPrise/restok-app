import { INestApplication } from '@nestjs/common';
import {
  auth,
  createGroupWith,
  registerPushToken,
  signUp,
  TestMember,
} from './utils/api';
import { createE2EApp, E2EContext } from './utils/e2e-app';
import { RecordingPushProvider } from './utils/recording-push.provider';

/**
 * Le parcours complet demandé par le §10 : take → notif → restock, à travers
 * l'EventEmitter et le listener réels. Seul l'appel réseau vers Expo est
 * remplacé.
 */
describe('Notifications (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;
  let push: RecordingPushProvider;
  let alice: TestMember;
  let bob: TestMember;
  let carol: TestMember;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
    push = ctx.push;
  });

  beforeEach(async () => {
    await ctx.reset();
    alice = await signUp(app, 'Alice');
    bob = await signUp(app, 'Bob');
    carol = await signUp(app, 'Carol');
    await createGroupWith(app, alice, [bob, carol]);

    await registerPushToken(app, alice, 'tok-alice');
    await registerPushToken(app, bob, 'tok-bob');
    // Carol n'enregistre aucun token : elle ne doit jamais être ciblée.
    push.clear();
  });

  // Un spy posé dans un test doit tomber même si l'assertion échoue, sinon il
  // contamine les suivants.
  afterEach(() => jest.restoreAllMocks());
  afterAll(() => ctx.close());

  const createItem = async (body: Record<string, unknown>) => {
    const res = await auth(app, alice).post('/items').send(body).expect(201);
    push.clear();
    return res.body as { id: string };
  };

  describe('rupture de stock', () => {
    it("prévient le groupe sauf l'auteur de la prise", async () => {
      const item = await createItem({ name: 'Papier toilette' });

      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await push.waitForMessages(1);

      expect(push.tokens).toEqual(['tok-alice']);
      expect(push.messages[0]).toMatchObject({
        title: 'Restock',
        body: "Papier toilette épuisé — quelqu'un doit racheter",
      });
    });

    it("n'envoie qu'une notification malgré les deux events", async () => {
      // La façade émet `… → out_of_stock` puis `out_of_stock → to_restock`.
      const item = await createItem({ name: 'Papier toilette' });

      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await push.waitForMessages(1);
      await push.settle();

      expect(push.messages).toHaveLength(1);
    });

    it('ne cible pas un membre sans push token', async () => {
      const item = await createItem({ name: 'Papier toilette' });

      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await push.waitForMessages(1);

      await push.settle();

      // Carol est dans le groupe mais n'a jamais enregistré de token, Bob est
      // l'auteur : Alice est la seule destinataire possible.
      expect(push.tokens).toEqual(['tok-alice']);
    });
  });

  describe('rachat', () => {
    it("prévient le groupe sauf l'acheteur", async () => {
      const item = await createItem({ name: 'Papier toilette' });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await push.waitForMessages(1);
      push.clear();

      await auth(app, alice).post(`/items/${item.id}/restock`).expect(200);
      await push.waitForMessages(1);

      expect(push.tokens).toEqual(['tok-bob']);
      expect(push.messages[0].body).toBe('Papier toilette racheté');
    });

    it('prévient aussi sur un rachat partiel qui laisse en stock bas', async () => {
      // Le §5 teste `newStatus === 'available'` et raterait ce cas.
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 1,
        lowThreshold: 3,
      });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await push.waitForMessages(1);
      push.clear();

      await auth(app, bob)
        .post(`/items/${item.id}/restock`)
        .send({ quantity: 2 })
        .expect(200);
      await push.waitForMessages(1);

      expect(push.messages[0].body).toBe('Café racheté');
      expect(push.tokens).toEqual(['tok-alice']);
    });
  });

  describe('silence', () => {
    it('ne dit rien sur une prise qui ne vide pas', async () => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 5,
        lowThreshold: 2,
      });

      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await push.settle();

      expect(push.messages).toHaveLength(0);
    });

    it('ne dit rien sur le passage en stock bas', async () => {
      const item = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 3,
        lowThreshold: 2,
      });

      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await push.settle();

      expect(push.messages).toHaveLength(0);
    });

    it('ne dit rien quand une action est refusée', async () => {
      const item = await createItem({ name: 'Papier toilette' });
      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await push.waitForMessages(1);
      push.clear();

      await auth(app, bob).post(`/items/${item.id}/take`).expect(409);
      await push.settle();

      expect(push.messages).toHaveLength(0);
    });
  });

  describe('tokens morts', () => {
    it('oublie un token DeviceNotRegistered', async () => {
      const item = await createItem({ name: 'Papier toilette' });
      push.failFor('tok-alice', 'DeviceNotRegistered');

      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await push.waitForMessages(1);

      push.succeedAlways();
      push.clear();
      await auth(app, bob).post(`/items/${item.id}/restock`).expect(200);
      await push.settle();

      // Alice n'a plus de token, Bob est l'auteur : personne à joindre.
      expect(push.messages).toHaveLength(0);
    });

    it('conserve un token après un échec réseau', async () => {
      const item = await createItem({ name: 'Papier toilette' });
      push.failFor('tok-alice', 'HTTP 503');

      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await push.waitForMessages(1);

      push.succeedAlways();
      push.clear();
      await auth(app, bob).post(`/items/${item.id}/restock`).expect(200);
      await push.settle();

      // Un timeout ne dit rien sur la validité du token.
      expect(push.tokens).toEqual(['tok-alice']);
    });
  });

  describe("l'action prime sur la notification", () => {
    it("committe la prise même si l'envoi plante", async () => {
      const item = await createItem({ name: 'Papier toilette' });
      jest
        .spyOn(push, 'send')
        .mockRejectedValueOnce(new Error('Expo injoignable'));

      await auth(app, bob).post(`/items/${item.id}/take`).expect(200);
      await push.settle();

      const res = await auth(app, bob).get('/items').expect(200);
      expect(res.body[0].status).toBe('to_restock');
    });
  });
});
