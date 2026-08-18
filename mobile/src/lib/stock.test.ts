import type { Item, ItemStatus } from '@/types/api';
import { fillPercent, fillRatio, isCritical } from './stock';

const item = (overrides: Partial<Item> = {}): Item =>
  ({
    id: 'item-1',
    name: 'Café',
    status: 'available' as ItemStatus,
    trackingType: 'quantity',
    quantity: 6,
    lowThreshold: 2,
    targetQuantity: 12,
    unit: null,
    packSize: null,
    format: null,
    groupId: 'group-1',
    lastAction: null,
    ...overrides,
  }) as Item;

describe('fillRatio', () => {
  it('vaut zéro sur un item épuisé, quelle que soit la quantité', () => {
    // Le statut prime : un item marqué à racheter montre un rail vide.
    expect(fillRatio(item({ status: 'to_restock', quantity: 3 }))).toBe(0);
    expect(fillRatio(item({ status: 'out_of_stock', quantity: 3 }))).toBe(0);
  });

  it('est plein en suivi binaire, qui ne compte rien', () => {
    expect(fillRatio(item({ trackingType: 'threshold', quantity: null }))).toBe(
      1,
    );
  });

  it('rapporte la quantité à la référence', () => {
    expect(fillRatio(item({ quantity: 6, targetQuantity: 12 }))).toBe(0.5);
  });

  it('plafonne à 1 quand le stock dépasse le plein', () => {
    // Le rachat peut dépasser la référence ; la jauge, elle, ne déborde pas.
    expect(fillRatio(item({ quantity: 30, targetQuantity: 12 }))).toBe(1);
  });

  it('traite une référence nulle comme du binaire', () => {
    expect(fillRatio(item({ quantity: 3, targetQuantity: null }))).toBe(1);
  });
});

describe('fillPercent', () => {
  it.each([
    [6, 12, 50],
    [1, 3, 33],
    [2, 3, 67],
    [0, 12, 0],
  ])('%s sur %s → %s %%', (quantity, targetQuantity, expected) => {
    const status: ItemStatus = quantity === 0 ? 'to_restock' : 'available';
    expect(fillPercent(item({ quantity, targetQuantity, status }))).toBe(
      expected,
    );
  });
});

describe('isCritical', () => {
  it('distingue le stock bas ordinaire du bord de la rupture', () => {
    // 1 sur 20 : bas et presque fini. 5 sur 20 : bas, sans plus.
    expect(
      isCritical(item({ status: 'low', quantity: 1, targetQuantity: 20 })),
    ).toBe(true);
    expect(
      isCritical(item({ status: 'low', quantity: 5, targetQuantity: 20 })),
    ).toBe(false);
  });

  it('ne concerne que les items en stock bas', () => {
    // Un item à racheter a son propre badge : il n'est pas « critique ».
    expect(isCritical(item({ status: 'to_restock', quantity: 0 }))).toBe(false);
    expect(
      isCritical(
        item({ status: 'available', quantity: 1, targetQuantity: 20 }),
      ),
    ).toBe(false);
  });
});
