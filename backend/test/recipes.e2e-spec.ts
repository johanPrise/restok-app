import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { auth, createGroupWith, signUp, TestMember } from './utils/api';
import { createE2EApp, E2EContext } from './utils/e2e-app';

describe('Recipes (e2e)', () => {
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

  const createItem = async (name: string) => {
    const res = await auth(app, alice)
      .post('/items')
      .send({ name })
      .expect(201);
    return res.body as { id: string; name: string };
  };

  const createRecipe = (member: TestMember, body: Record<string, unknown>) =>
    auth(app, member).post('/recipes').send(body);

  const names = (body: { ingredients: { name: string }[] }) =>
    body.ingredients.map((i) => i.name);

  describe('POST /recipes', () => {
    it('crée la recette et ses ingrédients en un seul appel', async () => {
      // En deux temps, un échec laisserait une recette vide — et la file
      // hors-ligne en fabriquerait à la chaîne.
      const riz = await createItem('Riz');

      const res = await createRecipe(bob, {
        name: 'Risotto',
        source: 'https://exemple.fr/risotto',
        description: '200 g de riz, 2 c. à soupe d’huile',
        servings: 4,
        ingredients: [{ itemId: riz.id }, { label: 'Sel' }],
      }).expect(201);

      expect(res.body).toMatchObject({
        name: 'Risotto',
        servings: 4,
        createdBy: 'Bob',
      });
      expect(names(res.body)).toEqual(['Riz', 'Sel']);
    });

    it('accepte une recette sans aucun ingrédient', async () => {
      const res = await createRecipe(bob, { name: 'Pâtes' }).expect(201);

      expect(res.body.ingredients).toEqual([]);
    });

    it('refuse un ingrédient qui porte les deux natures', async () => {
      const riz = await createItem('Riz');

      await createRecipe(bob, {
        name: 'Risotto',
        ingredients: [{ itemId: riz.id, label: 'Riz' }],
      }).expect(400);
    });

    it('refuse un ingrédient qui n’en porte aucune', async () => {
      await createRecipe(bob, {
        name: 'Risotto',
        ingredients: [{}],
      }).expect(400);
    });

    it('refuse deux fois le même item dans un même appel', async () => {
      // La contrainte d'unicité ne voit rien avant le `save` : sans ce contrôle
      // l'erreur remonterait en 500.
      const riz = await createItem('Riz');

      await createRecipe(bob, {
        name: 'Risotto',
        ingredients: [{ itemId: riz.id }, { itemId: riz.id }],
      }).expect(409);
    });

    it('ne crée rien quand un ingrédient est refusé', async () => {
      const riz = await createItem('Riz');
      await createRecipe(bob, {
        name: 'Risotto',
        ingredients: [{ itemId: riz.id }, {}],
      }).expect(400);

      const res = await auth(app, bob).get('/recipes').expect(200);
      expect(res.body).toEqual([]);
    });

    it("traite un item d'un autre groupe comme introuvable", async () => {
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol);
      const riz = await createItem('Riz');

      await createRecipe(carol, {
        name: 'Risotto',
        ingredients: [{ itemId: riz.id }],
      }).expect(404);
    });

    it('est ouverte à un simple membre — cuisiner n’est pas administrer', async () => {
      await createRecipe(bob, { name: 'Pâtes' }).expect(201);
    });

    it.each([
      ['un nom trop court', { name: 'x' }],
      ['un nombre de parts nul', { name: 'Pâtes', servings: 0 }],
      [
        'un item qui n’est pas un UUID',
        { name: 'Pâtes', ingredients: [{ itemId: 'nope' }] },
      ],
    ])('rejette %s', async (_label, body) => {
      await createRecipe(bob, body).expect(400);
    });
  });

  describe('GET /recipes', () => {
    it('suit le renommage d’un item', async () => {
      // Le nom se lit sur l'item : le recopier le figerait à la saisie.
      const riz = await createItem('Riz');
      await createRecipe(bob, {
        name: 'Risotto',
        ingredients: [{ itemId: riz.id }],
      }).expect(201);

      await auth(app, alice)
        .patch(`/items/${riz.id}`)
        .send({ name: 'Riz arborio' })
        .expect(200);

      const res = await auth(app, bob).get('/recipes').expect(200);
      expect(names(res.body[0])).toEqual(['Riz arborio']);
    });

    it('garde l’ordre de saisie des ingrédients', async () => {
      const riz = await createItem('Riz');
      const res = await createRecipe(bob, {
        name: 'Risotto',
        ingredients: [
          { label: 'Sel' },
          { itemId: riz.id },
          { label: 'Poivre' },
        ],
      }).expect(201);

      expect(names(res.body)).toEqual(['Sel', 'Riz', 'Poivre']);
    });

    it("ne montre pas les recettes d'un autre groupe", async () => {
      await createRecipe(bob, { name: 'Risotto' }).expect(201);
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol);

      const res = await auth(app, carol).get('/recipes').expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('ingrédients', () => {
    it('ajoute un item à une recette existante', async () => {
      const recipe = await createRecipe(bob, { name: 'Risotto' }).expect(201);
      const riz = await createItem('Riz');

      const res = await auth(app, bob)
        .post(`/recipes/${recipe.body.id}/ingredients`)
        .send({ itemId: riz.id })
        .expect(200);

      expect(names(res.body)).toEqual(['Riz']);
    });

    it('refuse le même item deux fois — la base tranche', async () => {
      const riz = await createItem('Riz');
      const recipe = await createRecipe(bob, {
        name: 'Risotto',
        ingredients: [{ itemId: riz.id }],
      }).expect(201);

      await auth(app, bob)
        .post(`/recipes/${recipe.body.id}/ingredients`)
        .send({ itemId: riz.id })
        .expect(409);
    });

    it('laisse plusieurs ingrédients libres coexister', async () => {
      const recipe = await createRecipe(bob, { name: 'Risotto' }).expect(201);

      await auth(app, bob)
        .post(`/recipes/${recipe.body.id}/ingredients`)
        .send({ label: 'Sel' })
        .expect(200);
      const res = await auth(app, bob)
        .post(`/recipes/${recipe.body.id}/ingredients`)
        .send({ label: 'Poivre' })
        .expect(200);

      expect(names(res.body)).toEqual(['Sel', 'Poivre']);
    });

    it('retire un ingrédient', async () => {
      const riz = await createItem('Riz');
      const recipe = await createRecipe(bob, {
        name: 'Risotto',
        ingredients: [{ itemId: riz.id }, { label: 'Sel' }],
      }).expect(201);

      const res = await auth(app, bob)
        .delete(
          `/recipes/${recipe.body.id}/ingredients/${recipe.body.ingredients[0].id}`,
        )
        .expect(200);

      expect(names(res.body)).toEqual(['Sel']);
    });

    it("traite la recette d'un autre groupe comme introuvable", async () => {
      const recipe = await createRecipe(bob, { name: 'Risotto' }).expect(201);
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol);

      await auth(app, carol)
        .post(`/recipes/${recipe.body.id}/ingredients`)
        .send({ label: 'Sel' })
        .expect(404);
    });
  });

  describe("l'item supprimé laisse son nom", () => {
    it('convertit l’ingrédient en ligne libre au lieu de le supprimer', async () => {
      // Contrairement à la liste de courses, qui supprime : une recette est un
      // document, la vider laisserait un risotto sans riz.
      const riz = await createItem('Riz');
      const recipe = await createRecipe(bob, {
        name: 'Risotto',
        ingredients: [{ itemId: riz.id }, { label: 'Sel' }],
      }).expect(201);

      await auth(app, alice).delete(`/items/${riz.id}`).expect(204);

      const res = await auth(app, bob)
        .get(`/recipes/${recipe.body.id}`)
        .expect(200);

      expect(names(res.body)).toEqual(['Riz', 'Sel']);
      expect(res.body.ingredients[0].itemId).toBeNull();
    });

    it('libère la place pour rattacher un nouvel item du même nom', async () => {
      const riz = await createItem('Riz');
      const recipe = await createRecipe(bob, {
        name: 'Risotto',
        ingredients: [{ itemId: riz.id }],
      }).expect(201);
      await auth(app, alice).delete(`/items/${riz.id}`).expect(204);

      const nouveau = await createItem('Riz');
      const res = await auth(app, bob)
        .post(`/recipes/${recipe.body.id}/ingredients`)
        .send({ itemId: nouveau.id })
        .expect(200);

      expect(names(res.body)).toEqual(['Riz', 'Riz']);
    });
  });

  describe('PATCH et DELETE /recipes/:id', () => {
    it('modifie la recette sans toucher aux ingrédients', async () => {
      const riz = await createItem('Riz');
      const recipe = await createRecipe(bob, {
        name: 'Risotto',
        ingredients: [{ itemId: riz.id }],
      }).expect(201);

      const res = await auth(app, bob)
        .patch(`/recipes/${recipe.body.id}`)
        .send({ name: 'Risotto aux champignons', servings: 6 })
        .expect(200);

      expect(res.body).toMatchObject({
        name: 'Risotto aux champignons',
        servings: 6,
      });
      expect(names(res.body)).toEqual(['Riz']);
    });

    it('retire la recette de la liste', async () => {
      const recipe = await createRecipe(bob, { name: 'Risotto' }).expect(201);

      await auth(app, bob).delete(`/recipes/${recipe.body.id}`).expect(204);

      const res = await auth(app, bob).get('/recipes').expect(200);
      expect(res.body).toEqual([]);
    });

    it("traite une recette d'un autre groupe comme introuvable", async () => {
      const recipe = await createRecipe(bob, { name: 'Risotto' }).expect(201);
      const carol = await signUp(app, 'Carol');
      await createGroupWith(app, carol);

      await auth(app, carol).delete(`/recipes/${recipe.body.id}`).expect(404);
    });
  });

  describe('POST /recipes/import', () => {
    const marmiton = readFileSync(
      join(__dirname, 'fixtures/marmiton.html'),
      'utf-8',
    );

    const importFrom = (member: TestMember, url: string) =>
      auth(app, member).post('/recipes/import').send({ url });

    it('sauvegarde la recette que l’utilisateur est en train de lire', async () => {
      ctx.setPage(marmiton);

      const res = await importFrom(
        bob,
        'https://www.marmiton.org/recettes/recette_x_1.aspx',
      ).expect(201);

      expect(res.body.name).toContain('Fricassée de poulet');
      expect(res.body.source).toContain('marmiton.org');
      // Les indications sont ce qui fait une recette : sans elles on n'aurait
      // sauvegardé qu'une liste de courses.
      expect(res.body.description.split('\n').length).toBeGreaterThan(3);
      expect(res.body.ingredients.length).toBeGreaterThan(5);
    });

    it('rattache à l’étagère ce qu’elle suit déjà', async () => {
      // Sans cet appariement la recette n'aurait que des lignes libres : elle
      // serait « on ne sait pas » et le tri par faisabilité ne dirait rien.
      await createItem('Miel');
      ctx.setPage(marmiton);

      const res = await importFrom(
        bob,
        'https://www.marmiton.org/r.aspx',
      ).expect(201);

      const miel = res.body.ingredients.find(
        (i: { name: string }) => i.name === 'Miel',
      );
      expect(miel?.itemId).not.toBeNull();
    });

    it('garde en texte libre ce que le groupe ne suit pas', async () => {
      ctx.setPage(marmiton);

      const res = await importFrom(
        bob,
        'https://www.marmiton.org/r.aspx',
      ).expect(201);

      expect(
        res.body.ingredients.map((i: { name: string }) => i.name),
      ).toContain('3 foie de volaille');
    });

    it('refuse une page sans données structurées, en disant quoi faire', async () => {
      ctx.setPage('<html><body>un blog sans recette</body></html>');

      const res = await importFrom(bob, 'https://exemple.fr/x').expect(400);

      expect(res.body.message).toMatch(/à la main|garde le lien/);
    });

    it.each([
      ['une adresse interne', 'http://localhost:3000/items'],
      [
        'les métadonnées de la machine',
        'http://169.254.169.254/latest/meta-data/',
      ],
      ['un réseau privé', 'http://192.168.1.12:3000/'],
      ['un protocole hors web', 'file:///etc/passwd'],
    ])('refuse %s', async (_label, url) => {
      // Sans ce filtre, le serveur irait lire pour le compte de l'appelant ce
      // que lui seul peut atteindre, et le renverrait dans une recette.
      await importFrom(bob, url).expect(400);
    });

    it('est ouverte à un simple membre', async () => {
      ctx.setPage(marmiton);

      await importFrom(bob, 'https://www.marmiton.org/r.aspx').expect(201);
    });
  });

  describe('accès', () => {
    it.each([
      ['la liste', (t: TestMember) => auth(app, t).get('/recipes')],
      [
        'une création',
        (t: TestMember) =>
          auth(app, t).post('/recipes').send({ name: 'Pâtes' }),
      ],
    ])('refuse %s à quelqu’un sans groupe', async (_label, call) => {
      const dave = await signUp(app, 'Dave');

      await call(dave).expect(403);
    });
  });
});
