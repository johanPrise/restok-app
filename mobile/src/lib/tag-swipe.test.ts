import type { Item } from '@/types/api';
import {
  canSwipe,
  defaultRestockUnits,
  emptiesOnTake,
  MAX_SWIPE_UNITS,
  maxUnits,
  movement,
  quantityAfter,
  ratioAfter,
} from './tag-swipe';

const item = (overrides: Partial<Item> = {}): Item =>
  ({
    id: 'item-1',
    name: 'Café',
    status: 'available',
    trackingType: 'quantity',
    quantity: 10,
    lowThreshold: 2,
    targetQuantity: 12,
    unit: null,
    packSize: null,
    format: null,
    groupId: 'group-1',
    lastAction: null,
    ...overrides,
  }) as Item;

describe('canSwipe', () => {
  it('interdit la prise sur un item déjà épuisé', () => {
    // Le backend répond 409 : le geste ne doit même pas partir.
    expect(canSwipe(item({ status: 'to_restock' }), 'take')).toBe(false);
    expect(canSwipe(item({ status: 'out_of_stock' }), 'take')).toBe(false);
  });

  it('autorise toujours le rachat', () => {
    // La state machine accepte `available → available`.
    expect(canSwipe(item({ status: 'to_restock' }), 'restock')).toBe(true);
    expect(canSwipe(item({ status: 'available' }), 'restock')).toBe(true);
  });
});

describe('maxUnits', () => {
  it('borne la prise au stock disponible', () => {
    // Proposer d'en prendre six quand il en reste trois n'a aucun sens.
    expect(maxUnits(item({ quantity: 3 }), 'take')).toBe(3);
  });

  it('plafonne au-delà de ce qu’un doigt peut exprimer', () => {
    expect(maxUnits(item({ quantity: 50 }), 'take')).toBe(MAX_SWIPE_UNITS);
  });

  it('vaut une seule unité en suivi binaire, qui ne compte rien', () => {
    expect(maxUnits(item({ trackingType: 'threshold' }), 'take')).toBe(1);
    expect(maxUnits(item({ trackingType: 'threshold' }), 'restock')).toBe(1);
  });
});

describe('quantityAfter', () => {
  it('retire ce qu’on demande', () => {
    expect(quantityAfter(item({ quantity: 10 }), 'take', 3)).toBe(7);
  });

  it('ne descend jamais sous zéro', () => {
    expect(quantityAfter(item({ quantity: 2 }), 'take', 5)).toBe(0);
  });

  it('ajoute au rachat au lieu d’écraser', () => {
    expect(quantityAfter(item({ quantity: 2 }), 'restock', 6)).toBe(8);
  });
});

describe('ratioAfter', () => {
  it('suit la jauge pendant le geste', () => {
    expect(
      ratioAfter(item({ quantity: 12, targetQuantity: 12 }), 'take', 6),
    ).toBe(0.5);
  });

  it('ne déborde pas au rachat', () => {
    expect(
      ratioAfter(item({ quantity: 12, targetQuantity: 12 }), 'restock', 6),
    ).toBe(1);
  });

  it('bascule de plein à vide en suivi binaire', () => {
    const binaire = item({ trackingType: 'threshold', targetQuantity: null });
    expect(ratioAfter(binaire, 'take', 1)).toBe(0);
    expect(ratioAfter(binaire, 'restock', 1)).toBe(1);
  });
});

describe('movement', () => {
  it("n'envoie rien en suivi binaire", () => {
    // Le backend refuse une quantité qu'il devrait ignorer.
    expect(movement(item({ trackingType: 'threshold' }), 3)).toBeUndefined();
  });

  it('transmet les unités en suivi par quantité', () => {
    expect(movement(item(), 3)).toBe(3);
  });
});

describe('defaultRestockUnits', () => {
  it('propose de quoi refaire le plein', () => {
    expect(defaultRestockUnits(item({ quantity: 2, targetQuantity: 12 }))).toBe(
      10,
    );
  });

  it("n'est pas plafonné par la course d'un doigt", () => {
    // `MAX_SWIPE_UNITS` borne le geste, pas ce qu'on rapporte du magasin :
    // « refaire le plein » s'arrêtait sinon à six.
    expect(defaultRestockUnits(item({ quantity: 0, targetQuantity: 24 }))).toBe(
      24,
    );
  });

  it('propose au moins une unité sur un stock déjà plein', () => {
    expect(
      defaultRestockUnits(item({ quantity: 12, targetQuantity: 12 })),
    ).toBe(1);
  });
});

describe('emptiesOnTake', () => {
  it('déclenche le décrochage sur la dernière unité', () => {
    expect(emptiesOnTake(item({ quantity: 1 }), 1)).toBe(true);
    expect(emptiesOnTake(item({ quantity: 3 }), 3)).toBe(true);
  });

  it('ne se déclenche pas tant qu’il reste quelque chose', () => {
    expect(emptiesOnTake(item({ quantity: 5 }), 2)).toBe(false);
  });

  it('vide toujours un item en suivi binaire', () => {
    // Un item binaire n'a pas de quantité : le backend la laisse à `null`.
    const binaire = item({ trackingType: 'threshold', quantity: null });
    expect(emptiesOnTake(binaire, 1)).toBe(true);
  });

  it('ne se déclenche pas sur un item déjà épuisé', () => {
    expect(emptiesOnTake(item({ status: 'to_restock', quantity: 0 }), 1)).toBe(
      false,
    );
  });
});
