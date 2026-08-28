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

    expect(res.body.entries).toHaveLength(2);
    expect(
      res.body.entries.map((e: { itemName: string }) => e.itemName),
    ).toEqual(['Papier toilette', 'Café']);
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

    expect(entries.body.entries[0]).toMatchObject({
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

    expect(res.body.entries[0].actionType).toBe('restocked');
    expect(res.body.entries[1].actionType).toBe('taken');
  });

  it('répond à « qu’a sorti untel »', async () => {
    // La première question d'une association.
    const cafe = await createItem({ name: 'Café' });
    await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);
    await auth(app, bob).post(`/items/${cafe.id}/restock`).expect(200);

    const res = await journal(bob, `?memberId=${bob.id}`).expect(200);

    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0].memberName).toBe('Bob');
  });

  it('borne la période', async () => {
    const cafe = await createItem({ name: 'Café' });
    await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);

    const demain = new Date(Date.now() + 86_400_000).toISOString();
    const res = await journal(bob, `?since=${demain}`).expect(200);

    expect(res.body.entries).toEqual([]);
  });

  it('garde la trace d’un item supprimé', async () => {
    // Ce qui a eu lieu a eu lieu : le ménage de l'étagère n'efface pas
    // l'année passée, et c'est exactement ce qu'une association attend.
    const cafe = await createItem({ name: 'Café' });
    await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);
    await auth(app, alice).delete(`/items/${cafe.id}`).expect(204);

    const res = await journal(bob).expect(200);

    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0].itemName).toBe('Café');
  });

  it('ne montre pas le journal d’un autre groupe', async () => {
    const cafe = await createItem({ name: 'Café' });
    await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);

    const carol = await signUp(app, 'Carol');
    await createGroupWith(app, carol);

    const res = await journal(carol).expect(200);
    expect(res.body.entries).toEqual([]);
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

  describe('la pagination', () => {
    /** Un item et `count` prises dessus, dans l'ordre. */
    const noise = async (count: number) => {
      const cafe = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: count,
      });
      for (let i = 0; i < count; i += 1) {
        await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);
      }
    };

    it('ne rend pas de curseur quand la page tient tout', async () => {
      await noise(2);

      const res = await journal(bob).expect(200);

      // `null` dit « il n'y a plus rien », pas « on n'a pas regardé ».
      expect(res.body.entries).toHaveLength(2);
      expect(res.body.nextCursor).toBeNull();
    });

    it('rend un curseur dès qu’il reste quelque chose derrière', async () => {
      await noise(5);

      const res = await journal(bob, '?limit=2').expect(200);

      expect(res.body.entries).toHaveLength(2);
      expect(res.body.nextCursor).toEqual(expect.any(String));
    });

    it('descend le registre entier sans sauter ni répéter une ligne', async () => {
      // Cinq prises dans la même seconde : c'est le cas où une pagination sur
      // la seule date perdrait des lignes, et il est ordinaire — clôturer des
      // courses écrit un rachat par ligne cochée.
      await noise(5);

      const vus: string[] = [];
      let cursor: string | null = null;

      do {
        const query: string = `?limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
        const page = await journal(bob, query).expect(200);

        vus.push(...page.body.entries.map((e: { id: string }) => e.id));
        cursor = page.body.nextCursor as string | null;
      } while (cursor);

      expect(vus).toHaveLength(5);
      expect(new Set(vus).size).toBe(5);
    });

    it('garde les filtres d’une page à l’autre', async () => {
      const cafe = await createItem({
        name: 'Café',
        trackingType: 'quantity',
        quantity: 10,
      });
      await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);
      await auth(app, bob).post(`/items/${cafe.id}/take`).expect(200);
      await auth(app, bob).post(`/items/${cafe.id}/take`).expect(200);

      const first = await journal(bob, `?memberId=${bob.id}&limit=1`).expect(
        200,
      );
      const next = await journal(
        bob,
        `?memberId=${bob.id}&limit=1&cursor=${encodeURIComponent(first.body.nextCursor)}`,
      ).expect(200);

      // Le curseur ne relâche pas le filtre : Alice n'apparaît nulle part.
      expect(first.body.entries[0].memberName).toBe('Bob');
      expect(next.body.entries[0].memberName).toBe('Bob');
      expect(next.body.nextCursor).toBeNull();
    });

    it('refuse un curseur illisible plutôt que de repartir du début', async () => {
      // Repartir du début serait pire qu'échouer : on relirait la première
      // page en croyant descendre.
      await journal(bob, '?cursor=pas-du-base64-valide!!').expect(400);
    });
  });

  describe('l’export', () => {
    const csv = (member: TestMember, query = '') =>
      auth(app, member).get(`/history/export${query}`);

    it('rend un fichier CSV, pas du JSON', async () => {
      const cafe = await createItem({ name: 'Café' });
      await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);

      const res = await csv(bob).expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      // Sérialisé en JSON, le fichier arriverait entre guillemets avec ses
      // retours à la ligne échappés.
      expect(res.text.startsWith('{')).toBe(false);
    });

    it('ouvre sur les en-têtes et porte une ligne par action', async () => {
      const cafe = await createItem({ name: 'Café' });
      await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);
      await auth(app, bob).post(`/items/${cafe.id}/restock`).expect(200);

      const lignes = (await csv(bob).expect(200)).text.trimEnd().split('\r\n');

      expect(lignes[0]).toContain('date,membre,item,action,quantite');
      expect(lignes).toHaveLength(3);
      expect(lignes[1]).toContain('Bob,Café,restocked');
      expect(lignes[2]).toContain('Alice,Café,taken');
    });

    it('reprend les mêmes filtres que le journal', async () => {
      const cafe = await createItem({ name: 'Café' });
      await auth(app, alice).post(`/items/${cafe.id}/take`).expect(200);
      await auth(app, bob).post(`/items/${cafe.id}/restock`).expect(200);

      const res = await csv(bob, `?memberId=${bob.id}`).expect(200);

      expect(res.text).toContain('Bob');
      expect(res.text).not.toContain('Alice');
    });

    it('échappe un nom d’item qui contient une virgule', async () => {
      // Sans ça, une seule ligne décale toutes les colonnes du fichier.
      const item = await createItem({ name: 'Pastilles, format familial' });
      await auth(app, alice).post(`/items/${item.id}/take`).expect(200);

      const res = await csv(bob).expect(200);

      expect(res.text).toContain('"Pastilles, format familial"');
    });

    it('reste fermé à qui n’est pas du groupe', async () => {
      const dave = await signUp(app, 'Dave');

      await csv(dave).expect(403);
    });
  });
});
