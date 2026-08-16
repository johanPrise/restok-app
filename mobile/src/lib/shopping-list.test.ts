import type { Item, ShoppingLine } from '@/types/api';
import {
  checkedCount,
  checkedSummary,
  initial,
  itemsOnList,
  lineQuantity,
  missingFromList,
  splitLines,
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
  it('compte ce qui est déjà dans le chariot', () => {
    expect(
      checkedSummary([
        line({ id: 'a', checked: true }),
        line({ id: 'b' }),
        line({ id: 'c' }),
      ]),
    ).toBe('1 sur 3 coché');
  });

  it('accorde au pluriel au-delà de un', () => {
    expect(
      checkedSummary([
        line({ id: 'a', checked: true }),
        line({ id: 'b', checked: true }),
      ]),
    ).toBe('2 sur 2 cochés');
  });

  it('tient sur une liste vide', () => {
    expect(checkedSummary([])).toBe('0 sur 0 cochés');
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
    expect(lineQuantity(line({ quantity: 3, unit: 'bidon' }))).toBe('3 bidons');
  });

  it('dit les paquets *et* les unités — « 2 » de quoi, sinon ?', () => {
    expect(
      lineQuantity(line({ quantity: 12, unit: 'rouleau', packSize: 6 })),
    ).toBe('2 paquets · 12 rouleaux');
  });

  it('reste en unités quand le compte ne tombe pas juste sur un paquet', () => {
    // Sept rouleaux, ce n'est ni un paquet ni deux : afficher « 1,17 paquet »
    // ne veut rien dire au rayon.
    expect(
      lineQuantity(line({ quantity: 7, unit: 'rouleau', packSize: 6 })),
    ).toBe('7 rouleaux');
  });

  it('n’écrit rien quand la ligne ne dit pas de quantité', () => {
    expect(lineQuantity(line({ quantity: null }))).toBeNull();
  });

  it('donne le nombre nu sur une ligne libre, sans mot générique', () => {
    expect(lineQuantity(line({ quantity: 2 }))).toBe('2');
  });

  it('écrit « 1 rouleau » au singulier', () => {
    expect(lineQuantity(line({ quantity: 1, unit: 'rouleau' }))).toBe(
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
