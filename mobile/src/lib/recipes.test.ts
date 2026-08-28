import type { Item, ItemStatus, Recipe } from '@/types/api';
import {
  feasibility,
  feasibilityLabel,
  feasibleNow,
  recipeByline,
  sortByFeasibility,
  type Feasibility,
} from './recipes';

const item = (id: string, name: string, status: ItemStatus): Item => ({
  id,
  name,
  status,
  trackingType: 'threshold',
  quantity: null,
  lowThreshold: 1,
  targetQuantity: null,
  unit: null,
  packSize: null,
  format: null,
  groupId: 'group-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  lastAction: null,
});

const recipe = (
  name: string,
  ingredients: { itemId?: string; name: string }[],
): Recipe => ({
  id: `recipe-${name}`,
  name,
  source: null,
  description: null,
  servings: null,
  createdBy: null,
  ingredients: ingredients.map((ingredient, index) => ({
    id: `ing-${index}`,
    itemId: ingredient.itemId ?? null,
    name: ingredient.name,
  })),
});

describe('feasibility', () => {
  it('dit que tout est là quand aucun item lié n’est épuisé', () => {
    const state = feasibility(
      recipe('Risotto', [{ itemId: 'a', name: 'Riz' }]),
      [item('a', 'Riz', 'available')],
    );

    expect(state).toEqual({ kind: 'ready' });
  });

  it('nomme ce qui manque, pour ne pas obliger à ouvrir la recette', () => {
    const state = feasibility(
      recipe('Risotto', [
        { itemId: 'a', name: 'Riz' },
        { itemId: 'b', name: 'Bouillon' },
      ]),
      [item('a', 'Riz', 'to_restock'), item('b', 'Bouillon', 'available')],
    );

    expect(state).toEqual({ kind: 'missing', items: ['Riz'] });
  });

  it('cuisine encore sur un stock bas', () => {
    // Règle volontairement plus stricte que celle des courses : on achète avant
    // la rupture, mais on cuisine jusqu'à la rupture.
    const state = feasibility(
      recipe('Risotto', [{ itemId: 'a', name: 'Riz' }]),
      [item('a', 'Riz', 'low')],
    );

    expect(state).toEqual({ kind: 'ready' });
  });

  it('compte un item à racheter comme manquant', () => {
    const state = feasibility(
      recipe('Risotto', [{ itemId: 'a', name: 'Riz' }]),
      [item('a', 'Riz', 'out_of_stock')],
    );

    expect(state.kind).toBe('missing');
  });

  it('ignore les ingrédients libres : personne ne suit le sel', () => {
    const state = feasibility(
      recipe('Risotto', [{ itemId: 'a', name: 'Riz' }, { name: 'Sel' }]),
      [item('a', 'Riz', 'available')],
    );

    expect(state).toEqual({ kind: 'ready' });
  });

  it('reste muette quand aucun ingrédient n’est suivi', () => {
    // « Tout est là » sur la foi de rien serait le mensonge tranquille que cet
    // écran doit justement éviter.
    const state = feasibility(recipe('Vinaigrette', [{ name: 'Sel' }]), []);

    expect(state).toEqual({ kind: 'unknown' });
  });

  it('ne compte ni pour ni contre un item absent de l’étagère', () => {
    // Supprimé entre deux rafraîchissements : on ne sait pas, on n'invente pas.
    const state = feasibility(
      recipe('Risotto', [{ itemId: 'a', name: 'Riz' }]),
      [],
    );

    expect(state).toEqual({ kind: 'ready' });
  });
});

describe('sortByFeasibility', () => {
  it('met en tête ce qui se cuisine ce soir', () => {
    const shelf = [
      item('a', 'Riz', 'available'),
      item('b', 'Bouillon', 'to_restock'),
    ];
    const sorted = sortByFeasibility(
      [
        recipe('Soupe', [{ itemId: 'b', name: 'Bouillon' }]),
        recipe('Risotto', [{ itemId: 'a', name: 'Riz' }]),
      ],
      shelf,
      'fr',
    );

    expect(sorted.map((entry) => entry.recipe.name)).toEqual([
      'Risotto',
      'Soupe',
    ]);
  });

  it('classe par nombre de manquants croissant', () => {
    const shelf = [
      item('a', 'Riz', 'to_restock'),
      item('b', 'Bouillon', 'to_restock'),
    ];
    const sorted = sortByFeasibility(
      [
        recipe('Deux', [
          { itemId: 'a', name: 'Riz' },
          { itemId: 'b', name: 'Bouillon' },
        ]),
        recipe('Une', [{ itemId: 'a', name: 'Riz' }]),
      ],
      shelf,
      'fr',
    );

    expect(sorted.map((entry) => entry.recipe.name)).toEqual(['Une', 'Deux']);
  });

  it('renvoie les muettes en dernier, jamais entre deux plats', () => {
    const sorted = sortByFeasibility(
      [
        recipe('Vinaigrette', [{ name: 'Sel' }]),
        recipe('Soupe', [{ itemId: 'b', name: 'Bouillon' }]),
      ],
      [item('b', 'Bouillon', 'to_restock')],
      'fr',
    );

    expect(sorted.map((entry) => entry.recipe.name)).toEqual([
      'Soupe',
      'Vinaigrette',
    ]);
  });

  it('départage à égalité par l’alphabet de la langue affichée', () => {
    const sorted = sortByFeasibility(
      [recipe('Œufs', []), recipe('Épinards', []), recipe('Ail', [])],
      [],
      'fr',
    );

    expect(sorted.map((entry) => entry.recipe.name)).toEqual([
      'Ail',
      'Épinards',
      'Œufs',
    ]);
  });
});

describe('feasibilityLabel', () => {
  const cases: [Feasibility, string][] = [
    [{ kind: 'ready' }, 'Tout est là'],
    [{ kind: 'unknown' }, 'On ne sait pas'],
    [{ kind: 'missing', items: ['Riz'] }, 'Il manque 1'],
    [{ kind: 'missing', items: ['Riz', 'Sel'] }, 'Il manque 2'],
  ];

  it.each(cases)('rend %j lisible', (state, expected) => {
    expect(feasibilityLabel(state, 'fr')).toBe(expected);
  });

  it('parle anglais quand c’est la langue affichée', () => {
    expect(feasibilityLabel({ kind: 'ready' }, 'en')).toBe('All there');
    expect(feasibilityLabel({ kind: 'missing', items: ['Riz'] }, 'en')).toBe(
      '1 missing',
    );
  });
});

describe('feasibleNow', () => {
  const shelf = [
    item('a', 'Riz', 'available'),
    item('b', 'Bouillon', 'to_restock'),
  ];

  it('ne retient que ce qui se cuisine tout de suite', () => {
    const found = feasibleNow(
      [
        recipe('Soupe', [{ itemId: 'b', name: 'Bouillon' }]),
        recipe('Risotto', [{ itemId: 'a', name: 'Riz' }]),
      ],
      shelf,
      'fr',
    );

    expect(found.map((r) => r.name)).toEqual(['Risotto']);
  });

  it('écarte les muettes : on n’annonce pas ce dont on ne sait rien', () => {
    expect(
      feasibleNow([recipe('Vinaigrette', [{ name: 'Sel' }])], shelf, 'fr'),
    ).toEqual([]);
  });

  it('s’arrête à trois — au-delà c’est une seconde liste', () => {
    const many = Array.from({ length: 5 }, (_, index) =>
      recipe(`Plat ${index}`, [{ itemId: 'a', name: 'Riz' }]),
    );

    expect(feasibleNow(many, shelf, 'fr')).toHaveLength(3);
  });

  it('rend une liste vide quand rien n’est faisable', () => {
    expect(
      feasibleNow(
        [recipe('Soupe', [{ itemId: 'b', name: 'Bouillon' }])],
        shelf,
        'fr',
      ),
    ).toEqual([]);
  });
});

describe('recipeByline', () => {
  const signed = (
    servings: number | null,
    createdBy: string | null,
  ): Recipe => ({
    ...recipe('Risotto', []),
    servings,
    createdBy,
  });

  it('annonce les parts et l’auteur, séparés', () => {
    expect(recipeByline(signed(4, 'Sam'), 'fr')).toBe('Pour 4 · Notée par Sam');
    expect(recipeByline(signed(4, 'Sam'), 'en')).toBe(
      'Serves 4 · Noted by Sam',
    );
  });

  it('retire l’auteur en solo — c’est toujours celui qui lit', () => {
    expect(recipeByline(signed(4, 'Sam'), 'fr', true)).toBe('Pour 4');
  });

  it('ne rend rien plutôt qu’une ligne vide quand il n’y a rien à dire', () => {
    expect(recipeByline(signed(null, null), 'fr')).toBeNull();
    // Seul et sans nombre de parts : l’auteur était la dernière chose à dire.
    expect(recipeByline(signed(null, 'Sam'), 'fr', true)).toBeNull();
  });
});
