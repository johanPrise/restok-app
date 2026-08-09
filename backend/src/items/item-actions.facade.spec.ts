import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { ActionHistoryService } from '../action-history/action-history.service';
import { ActionType } from '../action-history/entities/action-history.entity';
import { Item, ItemStatus, TrackingType } from './entities/item.entity';
import {
  ITEM_STATUS_CHANGED,
  ItemStatusChangedEvent,
} from './events/item-status-changed.event';
import { ItemActionsFacade } from './item-actions.facade';
import { QuantityTrackingStrategy } from './strategies/quantity-tracking.strategy';
import { ThresholdTrackingStrategy } from './strategies/threshold-tracking.strategy';
import { TrackingStrategyFactory } from './strategies/tracking-strategy.factory';

describe('ItemActionsFacade', () => {
  let facade: ItemActionsFacade;
  let itemRepo: {
    findOne: jest.Mock<Promise<Item | null>, [unknown]>;
    save: jest.Mock<Promise<Item>, [Item]>;
  };
  let historyService: jest.Mocked<ActionHistoryService>;
  let emitter: jest.Mocked<EventEmitter2>;

  const buildItem = (overrides: Partial<Item> = {}): Item =>
    ({
      id: 'item-1',
      name: 'Papier toilette',
      status: ItemStatus.AVAILABLE,
      trackingType: TrackingType.THRESHOLD,
      quantity: null,
      lowThreshold: 1,
      groupId: 'group-1',
      ...overrides,
    }) as Item;

  const emittedEvents = (): ItemStatusChangedEvent[] =>
    emitter.emit.mock.calls.map(([, event]) => event as ItemStatusChangedEvent);

  beforeEach(async () => {
    itemRepo = {
      findOne: jest.fn<Promise<Item | null>, [unknown]>(),
      save: jest.fn((item: Item) => Promise.resolve(item)),
    };

    const manager = {
      getRepository: () => itemRepo,
    } as unknown as EntityManager;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ItemActionsFacade,
        TrackingStrategyFactory,
        ThresholdTrackingStrategy,
        QuantityTrackingStrategy,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((cb: (m: EntityManager) => Promise<unknown>) =>
              cb(manager),
            ),
          },
        },
        {
          provide: ActionHistoryService,
          useValue: { record: jest.fn() },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    facade = moduleRef.get(ItemActionsFacade);
    historyService = moduleRef.get(ActionHistoryService);
    emitter = moduleRef.get(EventEmitter2);
  });

  describe('take en mode binaire', () => {
    beforeEach(() => itemRepo.findOne.mockResolvedValue(buildItem()));

    it('persiste to_restock, pas out_of_stock', () => {
      // La rupture est traversée puis dépassée dans la même transaction.
      return facade.take('item-1', 'group-1', 'member-1').then((item) => {
        expect(item.status).toBe(ItemStatus.TO_RESTOCK);
      });
    });

    it("n'écrit qu'une fois en base", async () => {
      await facade.take('item-1', 'group-1', 'member-1');

      expect(itemRepo.save).toHaveBeenCalledTimes(1);
    });

    it('émet les deux transitions du §2', async () => {
      await facade.take('item-1', 'group-1', 'member-1');

      expect(
        emittedEvents().map((e) => [e.previousStatus, e.newStatus]),
      ).toEqual([
        [ItemStatus.AVAILABLE, ItemStatus.OUT_OF_STOCK],
        [ItemStatus.OUT_OF_STOCK, ItemStatus.TO_RESTOCK],
      ]);
    });

    it('émet un event de rupture exploitable par le listener du §4', async () => {
      await facade.take('item-1', 'group-1', 'member-1');

      const rupture = emittedEvents().find(
        (e) => e.newStatus === ItemStatus.OUT_OF_STOCK,
      );
      expect(rupture).toMatchObject({
        itemId: 'item-1',
        itemName: 'Papier toilette',
        groupId: 'group-1',
        triggeredByMemberId: 'member-1',
      });
    });

    it("émet sous le nom d'event attendu", async () => {
      await facade.take('item-1', 'group-1', 'member-1');

      expect(emitter.emit.mock.calls[0][0]).toBe(ITEM_STATUS_CHANGED);
    });

    it("enregistre l'action dans l'historique, dans la transaction", async () => {
      await facade.take('item-1', 'group-1', 'member-1');

      expect(historyService.record).toHaveBeenCalledWith(
        'item-1',
        'member-1',
        ActionType.TAKEN,
        // Suivi binaire : rien à compter.
        null,
        expect.anything(),
      );
    });
  });

  describe('restock en mode binaire', () => {
    it('remet disponible depuis to_restock', async () => {
      itemRepo.findOne.mockResolvedValue(
        buildItem({ status: ItemStatus.TO_RESTOCK }),
      );

      const item = await facade.restock('item-1', 'group-1', 'member-2');

      expect(item.status).toBe(ItemStatus.AVAILABLE);
      expect(emittedEvents()).toHaveLength(1);
    });

    it('produit la transition attendue par le listener « racheté »', async () => {
      itemRepo.findOne.mockResolvedValue(
        buildItem({ status: ItemStatus.TO_RESTOCK }),
      );

      await facade.restock('item-1', 'group-1', 'member-2');

      expect(emittedEvents()[0]).toMatchObject({
        previousStatus: ItemStatus.TO_RESTOCK,
        newStatus: ItemStatus.AVAILABLE,
        triggeredByMemberId: 'member-2',
      });
    });
  });

  describe('mode quantité', () => {
    const quantityItem = (overrides: Partial<Item> = {}) =>
      buildItem({
        trackingType: TrackingType.QUANTITY,
        quantity: 5,
        lowThreshold: 2,
        ...overrides,
      });

    it('décrémente sans changer de statut', async () => {
      itemRepo.findOne.mockResolvedValue(quantityItem());

      const item = await facade.take('item-1', 'group-1', 'member-1');

      expect(item).toMatchObject({
        quantity: 4,
        status: ItemStatus.AVAILABLE,
      });
    });

    it('émet un event même quand le statut ne bouge pas', async () => {
      itemRepo.findOne.mockResolvedValue(quantityItem());

      await facade.take('item-1', 'group-1', 'member-1');

      expect(emittedEvents()[0]).toMatchObject({
        previousStatus: ItemStatus.AVAILABLE,
        newStatus: ItemStatus.AVAILABLE,
      });
    });

    it('enchaîne rupture puis à racheter sur la dernière unité', async () => {
      itemRepo.findOne.mockResolvedValue(quantityItem({ quantity: 1 }));

      const item = await facade.take('item-1', 'group-1', 'member-1');

      expect(item).toMatchObject({
        quantity: 0,
        status: ItemStatus.TO_RESTOCK,
      });
      expect(emittedEvents()).toHaveLength(2);
    });

    it('exige la quantité au rachat', async () => {
      itemRepo.findOne.mockResolvedValue(
        quantityItem({ quantity: 0, status: ItemStatus.TO_RESTOCK }),
      );

      await expect(
        facade.restock('item-1', 'group-1', 'member-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(itemRepo.save).not.toHaveBeenCalled();
    });

    it('accepte un rachat partiel qui laisse en stock bas', async () => {
      // to_restock → low n'est pas sur le schéma du §2 mais un rachat de 1 sur
      // un seuil de 2 est légitime : sans cette arête l'action est rejetée.
      itemRepo.findOne.mockResolvedValue(
        quantityItem({ quantity: 0, status: ItemStatus.TO_RESTOCK }),
      );

      const item = await facade.restock('item-1', 'group-1', 'member-1', 1);

      expect(item).toMatchObject({ quantity: 1, status: ItemStatus.LOW });
    });

    it('applique la quantité rachetée', async () => {
      itemRepo.findOne.mockResolvedValue(
        quantityItem({ quantity: 0, status: ItemStatus.TO_RESTOCK }),
      );

      const item = await facade.restock('item-1', 'group-1', 'member-1', 12);

      expect(item).toMatchObject({
        quantity: 12,
        status: ItemStatus.AVAILABLE,
      });
    });

    it('prend plusieurs unités d’un coup', async () => {
      itemRepo.findOne.mockResolvedValue(quantityItem({ quantity: 10 }));

      const item = await facade.take('item-1', 'group-1', 'member-1', 3);

      expect(item).toMatchObject({
        quantity: 7,
        status: ItemStatus.AVAILABLE,
      });
    });

    it('ajoute au stock existant au rachat', async () => {
      itemRepo.findOne.mockResolvedValue(quantityItem({ quantity: 2 }));

      const item = await facade.restock('item-1', 'group-1', 'member-1', 6);

      expect(item).toMatchObject({ quantity: 8 });
    });

    it("consigne dans l'historique ce qui a réellement bougé", async () => {
      // Prendre cinq unités quand il en reste deux n'en consomme que deux.
      itemRepo.findOne.mockResolvedValue(quantityItem({ quantity: 2 }));

      await facade.take('item-1', 'group-1', 'member-1', 5);

      expect(historyService.record).toHaveBeenCalledWith(
        'item-1',
        'member-1',
        ActionType.TAKEN,
        2,
        expect.anything(),
      );
    });

    it('consigne la quantité rachetée', async () => {
      itemRepo.findOne.mockResolvedValue(quantityItem({ quantity: 2 }));

      await facade.restock('item-1', 'group-1', 'member-1', 6);

      expect(historyService.record).toHaveBeenCalledWith(
        'item-1',
        'member-1',
        ActionType.RESTOCKED,
        6,
        expect.anything(),
      );
    });
  });

  describe('refus', () => {
    it.each([ItemStatus.OUT_OF_STOCK, ItemStatus.TO_RESTOCK])(
      'refuse une prise sur un item en %s',
      async (status) => {
        itemRepo.findOne.mockResolvedValue(buildItem({ status }));

        await expect(
          facade.take('item-1', 'group-1', 'member-1'),
        ).rejects.toBeInstanceOf(ConflictException);
      },
    );

    it("n'émet rien et n'écrit rien quand l'action est refusée", async () => {
      itemRepo.findOne.mockResolvedValue(
        buildItem({ status: ItemStatus.TO_RESTOCK }),
      );

      await expect(
        facade.take('item-1', 'group-1', 'member-1'),
      ).rejects.toThrow();

      expect(itemRepo.save).not.toHaveBeenCalled();
      expect(historyService.record).not.toHaveBeenCalled();
      expect(emitter.emit).not.toHaveBeenCalled();
    });

    it("refuse un item d'un autre groupe", async () => {
      itemRepo.findOne.mockResolvedValue(null);

      await expect(
        facade.take('item-1', 'autre-groupe', 'member-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('filtre sur le groupe dans la requête', async () => {
      itemRepo.findOne.mockResolvedValue(buildItem());

      await facade.take('item-1', 'group-1', 'member-1');

      expect(itemRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'item-1', groupId: 'group-1' },
      });
    });
  });

  describe('ordre des effets', () => {
    it('émet les events après le commit', async () => {
      itemRepo.findOne.mockResolvedValue(buildItem());
      const order: string[] = [];
      itemRepo.save.mockImplementation((item: Item) => {
        order.push('save');
        return Promise.resolve(item);
      });
      emitter.emit.mockImplementation(() => {
        order.push('emit');
        return true;
      });

      await facade.take('item-1', 'group-1', 'member-1');

      // Un listener qui relit l'item doit voir l'état validé, et un échec de
      // notification ne doit pas annuler l'action.
      expect(order).toEqual(['save', 'emit', 'emit']);
    });
  });
});
