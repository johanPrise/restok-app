import type { Item } from '@/types/api';
import {
  defaultRestockPacks,
  hasPacks,
  packSummary,
  unitsInPacks,
  withUnit,
} from './units';

const item = (overrides: Partial<Item> = {}): Item =>
  ({
    id: 'item-1',
    name: 'Papier toilette',
    status: 'available',
    trackingType: 'quantity',
    quantity: 6,
    lowThreshold: 2,
    targetQuantity: 24,
    unit: null,
    packSize: null,
    format: null,
    groupId: 'group-1',
    lastAction: null,
    ...overrides,
  }) as Item;

describe('hasPacks', () => {
  it.each([
    ['sans conditionnement', null, false],
    ['un « paquet de 1 » qui n’en est pas un', 1, false],
    ['un vrai lot', 6, true],
  ])('%s', (_label, packSize, expected) => {
    expect(hasPacks(item({ packSize }))).toBe(expected);
  });
});

describe('unitsInPacks', () => {
  it('convertit les paquets en unités de base', () => {
    // Le domaine ne compte qu'en unités : c'est ici que « 2 paquets » devient
    // douze rouleaux, et nulle part ailleurs.
    expect(unitsInPacks(item({ packSize: 6 }), 2)).toBe(12);
  });

  it('laisse le compte intact sans conditionnement', () => {
    expect(unitsInPacks(item({ packSize: null }), 3)).toBe(3);
  });
});

describe('withUnit', () => {
  it("ne met rien quand l'unité est inconnue", () => {
    // « 12 » se lit mieux que « 12 unités ».
    expect(withUnit(item(), 12)).toBe('12');
  });

  it('accorde au singulier', () => {
    expect(withUnit(item({ unit: 'bouteille' }), 1)).toBe('1 bouteille');
  });

  describe('pluriel français', () => {
    it.each([
      // Le défaut qui a motivé ces tests : un `s` ajouté à tout écrivait
      // « rouleaus ».
      ['rouleau', 2, '2 rouleaux'],
      ['seau', 3, '3 seaux'],
      ['jeu', 2, '2 jeux'],
      ['tuyau', 2, '2 tuyaux'],
      ['bidon', 2, '2 bidons'],
      ['dosette', 4, '4 dosettes'],
      ['éponge', 2, '2 éponges'],
      // Déjà terminés par s, x ou z : invariables.
      ['gaz', 2, '2 gaz'],
      ['sachets', 2, '2 sachets'],
      // Symboles de mesure : « 3 kg », jamais « 3 kgs ».
      ['kg', 3, '3 kg'],
      ['L', 2, '2 L'],
      ['mL', 5, '5 mL'],
    ])('%s ×%s → %s', (unit, count, expected) => {
      expect(withUnit(item({ unit }), count)).toBe(expected);
    });
  });
});

describe('defaultRestockPacks', () => {
  it('propose de quoi refaire le plein', () => {
    expect(
      defaultRestockPacks(
        item({ quantity: 6, targetQuantity: 24, packSize: 6 }),
      ),
    ).toBe(3);
  });

  it('arrondit au lot supérieur — on n’achète pas un tiers de paquet', () => {
    // Il manque 7 unités par paquets de 6 : deux paquets, pas un.
    expect(
      defaultRestockPacks(
        item({ quantity: 5, targetQuantity: 12, packSize: 6 }),
      ),
    ).toBe(2);
  });

  it('propose au moins un paquet quand le stock est déjà plein', () => {
    expect(
      defaultRestockPacks(
        item({ quantity: 24, targetQuantity: 24, packSize: 6 }),
      ),
    ).toBe(1);
  });

  it('compte en unités sans conditionnement', () => {
    expect(
      defaultRestockPacks(
        item({ quantity: 2, targetQuantity: 5, packSize: null }),
      ),
    ).toBe(3);
  });

  it('reste à un quand la référence est absente', () => {
    expect(defaultRestockPacks(item({ targetQuantity: null }))).toBe(1);
  });
});

describe('packSummary', () => {
  it("lève l'ambiguïté d'un compteur de lots", () => {
    expect(packSummary(item({ unit: 'rouleau', packSize: 6 }), 2, 'fr')).toBe(
      '2 paquets · 12 rouleaux',
    );
  });

  it('traduit « paquet », qui est notre mot, et pas « rouleau », qui est celui du foyer', () => {
    expect(packSummary(item({ unit: 'rouleau', packSize: 6 }), 2, 'en')).toBe(
      '2 packs · 12 rouleaux',
    );
  });

  it('accorde « paquet » au singulier', () => {
    expect(packSummary(item({ unit: 'rouleau', packSize: 6 }), 1, 'fr')).toBe(
      '1 paquet · 6 rouleaux',
    );
  });

  it("ne dit rien quand l'item ne s'achète pas par lot", () => {
    expect(packSummary(item({ packSize: null }), 2, 'fr')).toBeNull();
  });
});
