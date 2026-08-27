import type { Item, ShoppingLine } from '@/types/api';
import {
  checkedCount,
  checkedSummary,
  countable,
  initial,
  itemsOnList,
  lineQuantity,
  missingFromList,
  packsOf,
  splitLines,
  suggestedQuantity,
  suggestItems,
} from './shopping-list';

const line = (overrides: Partial<ShoppingLine> = {}): ShoppingLine => ({
  id: 'line-1',
  itemId: null,
  name: 'Pain',
  quantity: null,
  checked: false,
  checkedBy: null,
  checkedAt: null,
  unit: null,
  packSize: null,
  format: null,
  trackingType: null,
  ...overrides,
});

const item = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  name: 'Papier toilette',
  status: 'available',
  trackingType: 'quantity',
  quantity: 6,
  lowThreshold: 2,
  targetQuantity: 12,
  unit: 'rouleau',
  packSize: 6,
  format: null,
  groupId: 'group-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  lastAction: null,
  ...overrides,
});

describe('splitLines', () => {
  it("sépare ce qui vient de l'étagère de ce qu'on a ajouté", () => {
    const { fromShelf, free } = splitLines([
      line({ id: 'a', itemId: 'item-1', name: 'Lessive' }),
      line({ id: 'b', name: 'Pain' }),
    ]);

    expect(fromShelf.map((l) => l.id)).toEqual(['a']);
    expect(free.map((l) => l.id)).toEqual(['b']);
  });

  it("conserve l'ordre du serveur, qui met le non coché devant", () => {
    // Le tri est une décision du backend : le refaire ici, c'est risquer
    // d'inventer un second ordre qui contredira le premier.
    const { free } = splitLines([
      line({ id: 'a', name: 'Fromage' }),
      line({ id: 'b', name: 'Pain', checked: true }),
    ]);

    expect(free.map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('rend deux listes vides sur une liste vide', () => {
    expect(splitLines([])).toEqual({ fromShelf: [], free: [] });
  });
});

describe('checkedSummary', () => {
  const troisDontUn = [
    line({ id: 'a', checked: true }),
    line({ id: 'b' }),
    line({ id: 'c' }),
  ];

  it('compte ce qui est déjà dans le chariot', () => {
    expect(checkedSummary(troisDontUn, 'fr')).toBe('1 sur 3 coché');
    expect(checkedSummary(troisDontUn, 'en')).toBe('1 of 3 checked');
  });

  it('accorde au pluriel au-delà de un', () => {
    const deux = [
      line({ id: 'a', checked: true }),
      line({ id: 'b', checked: true }),
    ];

    expect(checkedSummary(deux, 'fr')).toBe('2 sur 2 cochés');
  });

  /**
   * Zéro est au singulier en français, au pluriel en anglais. Ici les deux
   * phrases se ressemblent — « checked » ne s'accorde pas — mais la **forme
   * choisie** diffère, et c'est elle qui compte : c'est la même mécanique qui,
   * dans le journal, produit « 0 prise » contre « 0 restocks ».
   */
  it('demande sa forme à la langue, au lieu de la coder', () => {
    expect(checkedSummary([], 'fr')).toBe('0 sur 0 coché');
    expect(checkedSummary([line({ id: 'a' })], 'fr')).toBe('0 sur 1 coché');
    expect(checkedSummary([line({ id: 'a' })], 'en')).toBe('0 of 1 checked');
  });
});

describe('checkedCount', () => {
  it('ne compte que le coché', () => {
    expect(
      checkedCount([line({ id: 'a', checked: true }), line({ id: 'b' })]),
    ).toBe(1);
  });
});

describe('lineQuantity', () => {
  it('accorde le nom de l’unité', () => {
    expect(lineQuantity(line({ quantity: 3, unit: 'bidon' }), 'fr')).toBe('3 bidons');
  });

  it('dit les paquets *et* les unités — « 2 » de quoi, sinon ?', () => {
    expect(
      lineQuantity(line({ quantity: 12, unit: 'rouleau', packSize: 6 }), 'fr'),
    ).toBe('2 paquets · 12 rouleaux');
  });

  it('reste en unités quand le compte ne tombe pas juste sur un paquet', () => {
    // Sept rouleaux, ce n'est ni un paquet ni deux : afficher « 1,17 paquet »
    // ne veut rien dire au rayon.
    expect(
      lineQuantity(line({ quantity: 7, unit: 'rouleau', packSize: 6 }), 'fr'),
    ).toBe('7 rouleaux');
  });

  it('n’écrit rien quand la ligne ne dit pas de quantité', () => {
    expect(lineQuantity(line({ quantity: null }), 'fr')).toBeNull();
  });

  it('donne le nombre nu sur une ligne libre, sans mot générique', () => {
    expect(lineQuantity(line({ quantity: 2 }), 'fr')).toBe('2');
  });

  it('écrit « 1 rouleau » au singulier', () => {
    expect(lineQuantity(line({ quantity: 1, unit: 'rouleau' }), 'fr')).toBe(
      '1 rouleau',
    );
  });
});

describe('initial', () => {
  it('prend la première lettre, en capitale', () => {
    expect(initial('sam')).toBe('S');
  });

  it('ignore les espaces de tête', () => {
    expect(initial('  Léa')).toBe('L');
  });

  it('rend une chaîne vide sur un nom vide', () => {
    expect(initial('   ')).toBe('');
  });
});

describe('itemsOnList', () => {
  it('ne retient que les lignes liées à un item', () => {
    const ids = itemsOnList([
      line({ id: 'a', itemId: 'item-1' }),
      line({ id: 'b' }),
    ]);

    expect([...ids]).toEqual(['item-1']);
  });
});

describe('missingFromList', () => {
  it("retient ce que l'étagère réclame et qui manque à la liste", () => {
    const missing = missingFromList(
      [
        item({ id: 'a', status: 'to_restock' }),
        item({ id: 'b', status: 'low' }),
        item({ id: 'c', status: 'available' }),
      ],
      [],
    );

    expect(missing.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('ignore ce qui est déjà versé — le bouton ne doit pas promettre du vide', () => {
    const missing = missingFromList(
      [item({ id: 'a', status: 'to_restock' })],
      [line({ itemId: 'a' })],
    );

    expect(missing).toEqual([]);
  });

  it('emporte les stocks bas : on va au magasin avant la rupture', () => {
    const missing = missingFromList([item({ id: 'a', status: 'low' })], []);

    expect(missing).toHaveLength(1);
  });

  it('laisse en paix ce qui ne manque pas', () => {
    expect(missingFromList([item({ status: 'available' })], [])).toEqual([]);
  });
});

describe('suggestItems', () => {
  it("propose l'item de l'étagère qui répond à ce qu'on tape", () => {
    const found = suggestItems([item({ name: 'Café' })], [], 'caf');

    expect(found.map((i) => i.name)).toEqual(['Café']);
  });

  it('ne propose rien tant que le champ est vide', () => {
    expect(suggestItems([item()], [], '   ')).toEqual([]);
  });

  it('écarte ce qui est déjà sur la liste — l’API le refuserait', () => {
    const cafe = item({ id: 'a', name: 'Café' });

    expect(suggestItems([cafe], [line({ itemId: 'a' })], 'caf')).toEqual([]);
  });

  it('ignore la casse, et cherche au milieu du nom', () => {
    const found = suggestItems(
      [item({ name: 'Papier toilette' })],
      [],
      'TOILET',
    );

    expect(found).toHaveLength(1);
  });

  it('s’arrête à trois : au-delà on lit une liste', () => {
    const items = Array.from({ length: 6 }, (_, index) =>
      item({ id: `item-${index}`, name: `Café ${index}` }),
    );

    expect(suggestItems(items, [], 'café')).toHaveLength(3);
  });
});

describe('suggestedQuantity', () => {
  it('propose de quoi refaire le plein, arrondi au paquet', () => {
    // Cible 12, il en reste 6, par lots de 6 : un paquet.
    expect(
      suggestedQuantity(item({ quantity: 6, targetQuantity: 12, packSize: 6 })),
    ).toBe(6);
  });

  it('monte au lot supérieur plutôt que de rester court', () => {
    expect(
      suggestedQuantity(item({ quantity: 0, targetQuantity: 10, packSize: 6 })),
    ).toBe(12);
  });

  it('ne compte rien en suivi binaire', () => {
    expect(
      suggestedQuantity(item({ trackingType: 'threshold' })),
    ).toBeUndefined();
  });

  it('propose au moins un paquet même quand le plein est atteint', () => {
    expect(
      suggestedQuantity(
        item({ quantity: 12, targetQuantity: 12, packSize: 6 }),
      ),
    ).toBe(6);
  });
});

describe('countable', () => {
  it('laisse compter un item suivi en quantité', () => {
    expect(countable(line({ trackingType: 'quantity' }))).toBe(true);
  });

  it('refuse de compter un item suivi en présence', () => {
    // Le rachat y ignore la quantité : proposer de la saisir promettrait un
    // effet qui n'aura pas lieu.
    expect(countable(line({ trackingType: 'threshold' }))).toBe(false);
  });

  it('laisse compter une ligne libre, qui n’a pas d’item pour l’interdire', () => {
    expect(countable(line({ trackingType: null }))).toBe(true);
  });
});

describe('packsOf', () => {
  it('compte en paquets quand l’item s’achète par lot', () => {
    expect(packsOf(line({ quantity: 12, packSize: 6 }))).toBe(2);
  });

  it('compte en unités sans conditionnement', () => {
    expect(packsOf(line({ quantity: 3 }))).toBe(3);
  });

  it('démarre à un quand la ligne ne dit pas de quantité', () => {
    // Zéro voudrait dire « ne pas acheter » — ce n'est pas ce qu'on demande
    // en ouvrant le compteur.
    expect(packsOf(line({ quantity: null }))).toBe(1);
  });

  it('arrondit au paquet supérieur un compte qui ne tombe pas juste', () => {
    expect(packsOf(line({ quantity: 7, packSize: 6 }))).toBe(2);
  });
});
