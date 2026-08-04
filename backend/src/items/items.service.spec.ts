import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Item, ItemStatus, TrackingType } from './entities/item.entity';
import { ItemsService } from './items.service';

describe('ItemsService', () => {
  let service: ItemsService;
  let itemRepo: jest.Mocked<Repository<Item>>;

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
      ],
    }).compile();

    service = moduleRef.get(ItemsService);
    itemRepo = moduleRef.get(getRepositoryToken(Item));
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
