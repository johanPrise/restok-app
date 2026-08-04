import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { subDays } from 'date-fns';
import { Repository } from 'typeorm';
import { Item, ItemStatus } from '../../items/entities/item.entity';
import { NotificationsService } from '../notifications.service';
import { STALE_AFTER_DAYS, StaleItemsJob } from './stale-items.job';

type NotifyGroupMock = jest.Mock<Promise<void>, [string, string]>;

describe('StaleItemsJob', () => {
  let job: StaleItemsJob;
  let itemRepo: jest.Mocked<Repository<Item>>;
  let notificationsService: { notifyGroup: NotifyGroupMock };

  const staleItem = (
    name: string,
    groupId: string,
    daysAgo = STALE_AFTER_DAYS + 1,
  ): Item =>
    ({
      id: `item-${name}`,
      name,
      groupId,
      status: ItemStatus.TO_RESTOCK,
      updatedAt: subDays(new Date(), daysAgo),
    }) as Item;

  beforeEach(async () => {
    notificationsService = { notifyGroup: jest.fn() as NotifyGroupMock };

    const moduleRef = await Test.createTestingModule({
      providers: [
        StaleItemsJob,
        {
          provide: getRepositoryToken(Item),
          useValue: { find: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    job = moduleRef.get(StaleItemsJob);
    itemRepo = moduleRef.get(getRepositoryToken(Item));
  });

  it('ne cible que les items à racheter dépassés', async () => {
    itemRepo.find.mockResolvedValue([]);

    await job.remindStaleItems();

    expect(itemRepo.find.mock.calls[0][0]).toMatchObject({
      where: { status: ItemStatus.TO_RESTOCK },
    });
  });

  it("n'envoie rien quand rien ne traîne", async () => {
    itemRepo.find.mockResolvedValue([]);

    await job.remindStaleItems();

    expect(notificationsService.notifyGroup).not.toHaveBeenCalled();
  });

  it('regroupe par groupe pour éviter la rafale', async () => {
    // 3 items en retard dans le même foyer = 1 notification, pas 3.
    itemRepo.find.mockResolvedValue([
      staleItem('PQ', 'group-1'),
      staleItem('Café', 'group-1'),
      staleItem('Éponges', 'group-1'),
    ]);

    await job.remindStaleItems();

    expect(notificationsService.notifyGroup).toHaveBeenCalledTimes(1);
    expect(notificationsService.notifyGroup).toHaveBeenCalledWith(
      'group-1',
      '3 items à racheter',
    );
  });

  it("nomme l'item quand il est seul, avec le vrai nombre de jours", async () => {
    itemRepo.find.mockResolvedValue([staleItem('PQ', 'group-1', 10)]);

    await job.remindStaleItems();

    expect(notificationsService.notifyGroup).toHaveBeenCalledWith(
      'group-1',
      'Toujours pas de PQ (10 jours)',
    );
  });

  it('sert chaque groupe séparément', async () => {
    itemRepo.find.mockResolvedValue([
      staleItem('PQ', 'group-1'),
      staleItem('Café', 'group-2'),
    ]);

    await job.remindStaleItems();

    expect(
      notificationsService.notifyGroup.mock.calls.map((c) => c[0]),
    ).toEqual(['group-1', 'group-2']);
  });

  it('continue quand un groupe échoue', async () => {
    itemRepo.find.mockResolvedValue([
      staleItem('PQ', 'group-1'),
      staleItem('Café', 'group-2'),
    ]);
    notificationsService.notifyGroup.mockRejectedValueOnce(
      new Error('Expo HS'),
    );

    await job.remindStaleItems();

    expect(notificationsService.notifyGroup).toHaveBeenCalledTimes(2);
  });
});
