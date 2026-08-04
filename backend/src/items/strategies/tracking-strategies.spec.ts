import { ActionType } from '../../action-history/entities/action-history.entity';
import { Item, ItemStatus, TrackingType } from '../entities/item.entity';
import {
  QuantityTrackingStrategy,
  statusForQuantity,
} from './quantity-tracking.strategy';
import { ThresholdTrackingStrategy } from './threshold-tracking.strategy';
import { TrackingStrategyFactory } from './tracking-strategy.factory';

const buildItem = (overrides: Partial<Item> = {}): Item =>
  ({
    id: 'item-1',
    name: 'Papier toilette',
    status: ItemStatus.AVAILABLE,
    trackingType: TrackingType.QUANTITY,
    quantity: 5,
    lowThreshold: 2,
    groupId: 'group-1',
    ...overrides,
  }) as Item;

describe('ThresholdTrackingStrategy', () => {
  const strategy = new ThresholdTrackingStrategy();

  it("passe en rupture dès que quelqu'un prend", () => {
    expect(
      strategy.computeNext(buildItem(), { type: ActionType.TAKEN }),
    ).toEqual({ status: ItemStatus.OUT_OF_STOCK });
  });

  it('remet disponible au rachat', () => {
    expect(
      strategy.computeNext(buildItem(), { type: ActionType.RESTOCKED }),
    ).toEqual({ status: ItemStatus.AVAILABLE });
  });

  it('ne renvoie jamais de quantité', () => {
    // Le mode binaire ne compte rien : `quantity` reste null en base.
    const result = strategy.computeNext(buildItem(), {
      type: ActionType.TAKEN,
    });
    expect(result.quantity).toBeUndefined();
  });

  it("ne produit jamais l'état low", () => {
    for (const type of [ActionType.TAKEN, ActionType.RESTOCKED]) {
      expect(strategy.computeNext(buildItem(), { type }).status).not.toBe(
        ItemStatus.LOW,
      );
    }
  });
});

describe('statusForQuantity', () => {
  it.each([
    [0, 2, ItemStatus.OUT_OF_STOCK],
    [1, 2, ItemStatus.LOW],
    [2, 2, ItemStatus.LOW],
    [3, 2, ItemStatus.AVAILABLE],
    [1, null, ItemStatus.LOW], // seuil par défaut : 1
    [2, null, ItemStatus.AVAILABLE],
  ])('quantité %s / seuil %s → %s', (quantity, threshold, expected) => {
    expect(statusForQuantity(quantity, threshold)).toBe(expected);
  });
});

describe('QuantityTrackingStrategy', () => {
  const strategy = new QuantityTrackingStrategy();

  describe('prise', () => {
    it('décrémente de 1', () => {
      expect(
        strategy.computeNext(buildItem({ quantity: 5 }), {
          type: ActionType.TAKEN,
        }),
      ).toEqual({ status: ItemStatus.AVAILABLE, quantity: 4 });
    });

    it('bascule en low au passage du seuil', () => {
      expect(
        strategy.computeNext(buildItem({ quantity: 3, lowThreshold: 2 }), {
          type: ActionType.TAKEN,
        }),
      ).toEqual({ status: ItemStatus.LOW, quantity: 2 });
    });

    it('bascule en rupture à zéro', () => {
      expect(
        strategy.computeNext(buildItem({ quantity: 1 }), {
          type: ActionType.TAKEN,
        }),
      ).toEqual({ status: ItemStatus.OUT_OF_STOCK, quantity: 0 });
    });

    it('ne descend jamais sous zéro', () => {
      expect(
        strategy.computeNext(buildItem({ quantity: 0 }), {
          type: ActionType.TAKEN,
        }),
      ).toEqual({ status: ItemStatus.OUT_OF_STOCK, quantity: 0 });
    });

    it('traite une quantité null comme zéro', () => {
      expect(
        strategy.computeNext(buildItem({ quantity: null }), {
          type: ActionType.TAKEN,
        }).quantity,
      ).toBe(0);
    });
  });

  describe('rachat', () => {
    it('applique la quantité rachetée', () => {
      expect(
        strategy.computeNext(buildItem({ quantity: 0, lowThreshold: 2 }), {
          type: ActionType.RESTOCKED,
          quantity: 12,
        }),
      ).toEqual({ status: ItemStatus.AVAILABLE, quantity: 12 });
    });

    it('reste en low si le rachat ne dépasse pas le seuil', () => {
      expect(
        strategy.computeNext(buildItem({ quantity: 0, lowThreshold: 5 }), {
          type: ActionType.RESTOCKED,
          quantity: 3,
        }),
      ).toEqual({ status: ItemStatus.LOW, quantity: 3 });
    });

    it('ne déclare pas disponible un item racheté à zéro', () => {
      // Le §4 renvoie `available` en dur au rachat, ce qui produisait un item
      // disponible avec une quantité nulle.
      expect(
        strategy.computeNext(buildItem({ quantity: 0 }), {
          type: ActionType.RESTOCKED,
          quantity: 0,
        }),
      ).toEqual({ status: ItemStatus.OUT_OF_STOCK, quantity: 0 });
    });
  });
});

describe('TrackingStrategyFactory', () => {
  const threshold = new ThresholdTrackingStrategy();
  const quantity = new QuantityTrackingStrategy();
  const factory = new TrackingStrategyFactory(threshold, quantity);

  it('route vers la stratégie quantité', () => {
    expect(factory.getStrategy(TrackingType.QUANTITY)).toBe(quantity);
  });

  it('route vers la stratégie binaire', () => {
    expect(factory.getStrategy(TrackingType.THRESHOLD)).toBe(threshold);
  });
});
