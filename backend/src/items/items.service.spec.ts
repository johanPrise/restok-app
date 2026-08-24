import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ActionHistoryService } from '../action-history/action-history.service';
import { ActionType } from '../action-history/entities/action-history.entity';
import { Item, ItemStatus, TrackingType } from './entities/item.entity';
import { ItemsService } from './items.service';

describe('ItemsService', () => {
  let service: ItemsService;
  let itemRepo: jest.Mocked<Repository<Item>>;
  let historyService: { findLastActionByItem: jest.Mock };

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

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: getRepositoryToken(Item),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn((dto: Partial<Item>) => dto as Item),
            save: jest.fn((item: Item) => Promise.resolve(item)),
            softRemove: jest.fn(),
          },
        },
        {
          provide: ActionHistoryService,
          useValue: {
            findLastActionByItem: jest.fn().mockResolvedValue(new Map()),
          },
        },
        {
          provide: EventEmitter2,
          // `emitAsync` et non `emit` : la suppression attend ses abonnés,
          // qui complètent le ménage en base.
          useValue: {
            emit: jest.fn(),
            emitAsync: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ItemsService);
    itemRepo = moduleRef.get(getRepositoryToken(Item));
    historyService = moduleRef.get(ActionHistoryService);
  });

  describe('create', () => {
    it('crée un item binaire disponible', async () => {
      const item = await service.create({ name: 'Café' }, 'group-1');

      expect(item).toMatchObject({
        trackingType: TrackingType.THRESHOLD,
        status: ItemStatus.AVAILABLE,
        quantity: null,
      });
    });

    it('déduit le statut initial de la quantité', async () => {
      const item = await service.create(
        {
          name: 'Café',
          trackingType: TrackingType.QUANTITY,
          quantity: 1,
          lowThreshold: 2,
        },
        'group-1',
      );

      expect(item.status).toBe(ItemStatus.LOW);
    });

    describe('quantité de référence', () => {
      it('prend la quantité initiale par défaut', async () => {
        const item = await service.create(
          { name: 'Café', trackingType: TrackingType.QUANTITY, quantity: 12 },
          'group-1',
        );

        expect(item.targetQuantity).toBe(12);
      });

      it('accepte une référence explicite différente du stock initial', async () => {
        // On crée l'item à moitié vide : plein, c'est 24.
        const item = await service.create(
          {
            name: 'Café',
            trackingType: TrackingType.QUANTITY,
            quantity: 12,
            targetQuantity: 24,
          },
          'group-1',
        );

        expect(item).toMatchObject({ quantity: 12, targetQuantity: 24 });
      });

      it('reste nulle en mode binaire, qui ne compte rien', async () => {
        const item = await service.create({ name: 'Papier' }, 'group-1');

        expect(item.targetQuantity).toBeNull();
      });

      it('ne se confond pas avec le seuil bas', async () => {
        // lowThreshold dit quand alerter, targetQuantity de quoi on affiche un
        // pourcentage — 2 sur 3 et 2 sur 24 alertent pareil, se lisent
        // différemment.
        const item = await service.create(
          {
            name: 'Café',
            trackingType: TrackingType.QUANTITY,
            quantity: 24,
            lowThreshold: 2,
          },
          'group-1',
        );

        expect(item.lowThreshold).toBe(2);
        expect(item.targetQuantity).toBe(24);
      });
    });

    describe('unité et conditionnement', () => {
      it("retient le nom de l'unité et la taille du paquet", async () => {
        const item = await service.create(
          {
            name: 'Papier toilette',
            trackingType: TrackingType.QUANTITY,
            quantity: 12,
            unit: 'rouleau',
            packSize: 6,
          },
          'group-1',
        );

        expect(item).toMatchObject({ unit: 'rouleau', packSize: 6 });
      });

      it('les laisse nuls quand rien n’est précisé', async () => {
        const item = await service.create({ name: 'Ampoules' }, 'group-1');

        expect(item).toMatchObject({ unit: null, packSize: null });
      });

      it('les conserve au retour en suivi binaire', async () => {
        // Contrairement à la quantité : décrire un item en rouleaux reste vrai
        // même quand on cesse de les compter.
        itemRepo.findOne.mockResolvedValue(
          buildItem({
            trackingType: TrackingType.QUANTITY,
            quantity: 12,
            unit: 'rouleau',
            packSize: 6,
          }),
        );

        const item = await service.update('item-1', 'group-1', {
          trackingType: TrackingType.THRESHOLD,
        });

        expect(item).toMatchObject({ unit: 'rouleau', packSize: 6 });
        expect(item.quantity).toBeNull();
      });
    });

    it('crée un item vide directement en to_restock', async () => {
      // out_of_stock n'est jamais un état de repos : un item créé à zéro doit
      // atterrir au même endroit qu'un item vidé par une prise.
      const item = await service.create(
        { name: 'Café', trackingType: TrackingType.QUANTITY, quantity: 0 },
        'group-1',
      );

      expect(item.status).toBe(ItemStatus.TO_RESTOCK);
    });

    it('exige une quantité initiale en mode quantité', async () => {
      await expect(
        service.create(
          { name: 'Café', trackingType: TrackingType.QUANTITY },
          'group-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rattache au groupe de l'appelant", async () => {
      const item = await service.create({ name: 'Café' }, 'group-1');

      expect(item.groupId).toBe('group-1');
    });
  });

  describe('update', () => {
    it('recalcule le statut au passage en mode quantité', async () => {
      itemRepo.findOne.mockResolvedValue(buildItem());

      const item = await service.update('item-1', 'group-1', {
        trackingType: TrackingType.QUANTITY,
        quantity: 1,
        lowThreshold: 3,
      });

      expect(item).toMatchObject({
        quantity: 1,
        status: ItemStatus.LOW,
      });
    });

    it('passe en to_restock si la reconfiguration met la quantité à zéro', async () => {
      itemRepo.findOne.mockResolvedValue(buildItem());

      const item = await service.update('item-1', 'group-1', {
        trackingType: TrackingType.QUANTITY,
        quantity: 0,
      });

      expect(item.status).toBe(ItemStatus.TO_RESTOCK);
    });

    it('exige une quantité pour passer en mode quantité', async () => {
      itemRepo.findOne.mockResolvedValue(buildItem());

      await expect(
        service.update('item-1', 'group-1', {
          trackingType: TrackingType.QUANTITY,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('pose une référence en passant en mode quantité', async () => {
      itemRepo.findOne.mockResolvedValue(buildItem());

      const item = await service.update('item-1', 'group-1', {
        trackingType: TrackingType.QUANTITY,
        quantity: 6,
      });

      expect(item.targetQuantity).toBe(6);
    });

    it('conserve la référence quand seul le stock change', async () => {
      itemRepo.findOne.mockResolvedValue(
        buildItem({
          trackingType: TrackingType.QUANTITY,
          quantity: 12,
          targetQuantity: 24,
        }),
      );

      const item = await service.update('item-1', 'group-1', { quantity: 6 });

      expect(item).toMatchObject({ quantity: 6, targetQuantity: 24 });
    });

    it('vide aussi la référence au retour en mode binaire', async () => {
      itemRepo.findOne.mockResolvedValue(
        buildItem({
          trackingType: TrackingType.QUANTITY,
          quantity: 4,
          targetQuantity: 12,
        }),
      );

      const item = await service.update('item-1', 'group-1', {
        trackingType: TrackingType.THRESHOLD,
      });

      expect(item.targetQuantity).toBeNull();
    });

    it('vide la quantité au retour en mode binaire', async () => {
      itemRepo.findOne.mockResolvedValue(
        buildItem({ trackingType: TrackingType.QUANTITY, quantity: 4 }),
      );

      const item = await service.update('item-1', 'group-1', {
        trackingType: TrackingType.THRESHOLD,
      });

      expect(item.quantity).toBeNull();
    });

    it('ramène low à disponible en mode binaire', async () => {
      // `low` n'existe pas en suivi binaire : le laisser produirait un statut
      // qu'aucune transition ne peut plus quitter.
      itemRepo.findOne.mockResolvedValue(
        buildItem({
          trackingType: TrackingType.QUANTITY,
          quantity: 1,
          status: ItemStatus.LOW,
        }),
      );

      const item = await service.update('item-1', 'group-1', {
        trackingType: TrackingType.THRESHOLD,
      });

      expect(item.status).toBe(ItemStatus.AVAILABLE);
    });

    it("préserve le statut to_restock lors d'un simple renommage", async () => {
      itemRepo.findOne.mockResolvedValue(
        buildItem({ status: ItemStatus.TO_RESTOCK }),
      );

      const item = await service.update('item-1', 'group-1', {
        name: 'PQ',
      });

      expect(item).toMatchObject({
        name: 'PQ',
        status: ItemStatus.TO_RESTOCK,
      });
    });
  });

  describe('isolation par groupe', () => {
    it('filtre sur le groupe', async () => {
      itemRepo.findOne.mockResolvedValue(buildItem());

      await service.findOneInGroup('item-1', 'group-1');

      expect(itemRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'item-1', groupId: 'group-1' },
      });
    });

    it("traite un item d'un autre groupe comme introuvable", async () => {
      itemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOneInGroup('item-1', 'autre-groupe'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuse de supprimer un item hors groupe', async () => {
      itemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove('item-1', 'autre-groupe'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(itemRepo.softRemove).not.toHaveBeenCalled();
    });
  });

  describe('findAllInGroup', () => {
    it('trie pour faire remonter ce qui demande une action', async () => {
      itemRepo.find.mockResolvedValue([]);

      await service.findAllInGroup('group-1');

      expect(itemRepo.find).toHaveBeenCalledWith({
        where: { groupId: 'group-1' },
        order: { status: 'DESC', name: 'ASC' },
      });
    });

    it('joint la dernière action de chaque item', async () => {
      const at = new Date('2026-08-01T10:00:00Z');
      itemRepo.find.mockResolvedValue([buildItem()]);
      historyService.findLastActionByItem.mockResolvedValue(
        new Map([
          ['item-1', { actionType: ActionType.TAKEN, at, memberName: 'Sam' }],
        ]),
      );

      const [item] = await service.findAllInGroup('group-1');

      expect(item.lastAction).toEqual({
        actionType: ActionType.TAKEN,
        at,
        memberName: 'Sam',
      });
    });

    it("n'interroge l'historique qu'une fois pour toute l'étagère", async () => {
      // Le point de la manœuvre : pas une requête par tag.
      itemRepo.find.mockResolvedValue([
        buildItem({ id: 'item-1' }),
        buildItem({ id: 'item-2' }),
        buildItem({ id: 'item-3' }),
      ]);

      await service.findAllInGroup('group-1');

      expect(historyService.findLastActionByItem).toHaveBeenCalledTimes(1);
      expect(historyService.findLastActionByItem).toHaveBeenCalledWith([
        'item-1',
        'item-2',
        'item-3',
      ]);
    });

    it("laisse lastAction à null quand rien ne s'est passé", async () => {
      itemRepo.find.mockResolvedValue([buildItem()]);
      historyService.findLastActionByItem.mockResolvedValue(new Map());

      const [item] = await service.findAllInGroup('group-1');

      expect(item.lastAction).toBeNull();
    });
  });

  describe('remove', () => {
    it('fait un soft-delete', async () => {
      const item = buildItem();
      itemRepo.findOne.mockResolvedValue(item);

      await service.remove('item-1', 'group-1');

      expect(itemRepo.softRemove).toHaveBeenCalledWith(item);
    });
  });
});
