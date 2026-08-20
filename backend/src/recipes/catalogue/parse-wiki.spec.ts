import { readFileSync } from 'fs';
import { join } from 'path';
import { parseWikiRecipe } from './parse-wiki';

const pages = JSON.parse(
  readFileSync(
    join(__dirname, '../../../test/fixtures/wikibooks.json'),
    'utf-8',
  ),
) as Record<string, string>;

const parse = (title: string) => parseWikiRecipe(title, pages[title]);

describe('parseWikiRecipe', () => {
  it('lit une vraie page — nom, ingrédients, étapes', () => {
    const recipe = parse('Livre de cuisine/Poulet basquaise');

    expect(recipe.name).toBe('Poulet basquaise');
    expect(recipe.ingredients).toContain('poulet');
    expect(recipe.ingredients).toContain('tomate');
    expect(recipe.steps.length).toBeGreaterThan(80);
  });

  it('rend les noms canoniques, pas les quantités', () => {
    // C'est tout l'intérêt de cette source : « 6 tomates bien mûres » ne se
    // rattacherait à rien, « tomate » se rattache à l'item du groupe.
    const recipe = parse('Livre de cuisine/Poulet basquaise');

    for (const ingredient of recipe.ingredients) {
      expect(ingredient).not.toMatch(/\d/);
      expect(ingredient).toBe(ingredient.toLowerCase());
    }
  });

  it('garde l’ordre de la page et ne répète pas un ingrédient', () => {
    const recipe = parse('Livre de cuisine/Poulet au riz');

    expect(recipe.ingredients[0]).toBe('poulet');
    expect(new Set(recipe.ingredients).size).toBe(recipe.ingredients.length);
  });

  it('déshabille le wikitexte des étapes', () => {
    const recipe = parse('Livre de cuisine/Poulet au riz');

    expect(recipe.steps).not.toMatch(/\{\{|\[\[|'''/);
  });

  it('coupe le préfixe du livre dans le titre', () => {
    expect(parse('Livre de cuisine/Poulet au riz').name).toBe('Poulet au riz');
  });

  it('lit l’accord affiché, pas le nom canonique, dans les étapes', () => {
    const recipe = parseWikiRecipe(
      'Livre de cuisine/Test',
      '== Préparation ==\n* Couper les {{i|tomate|tomates}} en quartiers.',
    );

    expect(recipe.steps).toBe('Couper les tomates en quartiers.');
  });

  it('tient sur une page sans section reconnaissable', () => {
    const recipe = parseWikiRecipe('Livre de cuisine/Vide', 'du texte libre');

    expect(recipe.name).toBe('Vide');
    expect(recipe.ingredients).toEqual([]);
    expect(recipe.steps).toBe('du texte libre');
  });
});
