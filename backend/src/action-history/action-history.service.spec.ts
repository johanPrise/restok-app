import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { EntityManager, Repository } from 'typeorm';
import { ActionHistoryService } from './action-history.service';
import { ActionHistory, ActionType } from './entities/action-history.entity';

describe('ActionHistoryService', () => {
  let service: ActionHistoryService;
  let historyRepo: jest.Mocked<Repository<ActionHistory>>;

  const buildEntry = (overrides: Partial<ActionHistory> = {}): ActionHistory =>
    ({
      id: 'entry-1',
      itemId: 'item-1',
      memberId: 'member-1',
      actionType: ActionType.TAKEN,
      createdAt: new Date('2026-08-01T10:00:00Z'),
      member: { id: 'member-1', name: 'Bob' },
      ...overrides,
    }) as ActionHistory;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ActionHistoryService,
        {
          provide: getRepositoryToken(ActionHistory),
          useValue: {
            find: jest.fn(),
            create: jest.fn((dto: Partial<ActionHistory>) => dto),
            save: jest.fn((entry: ActionHistory) => Promise.resolve(entry)),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ActionHistoryService);
    historyRepo = moduleRef.get(getRepositoryToken(ActionHistory));
  });

  describe('record', () => {
    it("écrit l'action", async () => {
      await service.record('item-1', 'member-1', ActionType.TAKEN);

      expect(historyRepo.create).toHaveBeenCalledWith({
        itemId: 'item-1',
        memberId: 'member-1',
        actionType: ActionType.TAKEN,
      });
      expect(historyRepo.save).toHaveBeenCalled();
    });

    it("écrit dans la transaction de l'appelant quand on lui en passe une", async () => {
      // L'entrée d'historique et le changement de statut doivent être atomiques.
      const txRepo = {
        create: jest.fn((dto: Partial<ActionHistory>) => dto),
        save: jest.fn(),
      };
      const manager = {
        getRepository: () => txRepo,
      } as unknown as EntityManager;

      await service.record('item-1', 'member-1', ActionType.RESTOCKED, manager);

      expect(txRepo.save).toHaveBeenCalled();
      expect(historyRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findByItem', () => {
    it('renvoie les entrées les plus récentes en premier', async () => {
      historyRepo.find.mockResolvedValue([buildEntry()]);

      await service.findByItem('item-1');

      expect(historyRepo.find).toHaveBeenCalledWith({
        where: { itemId: 'item-1' },
        relations: { member: true },
        order: { createdAt: 'DESC' },
      });
    });

    it("expose l'auteur sans le reste de sa fiche", async () => {
      historyRepo.find.mockResolvedValue([buildEntry()]);

      const [entry] = await service.findByItem('item-1');

      expect(entry).toEqual({
        id: 'entry-1',
        actionType: ActionType.TAKEN,
        createdAt: new Date('2026-08-01T10:00:00Z'),
        member: { id: 'member-1', name: 'Bob' },
      });
    });

    it('anonymise une action dont le membre a disparu', async () => {
      // Le compte est soft-deleted : l'action reste au journal, l'auteur
      // devient anonyme plutôt que de faire disparaître la ligne.
      historyRepo.find.mockResolvedValue([
        buildEntry({ member: null as unknown as ActionHistory['member'] }),
      ]);

      const [entry] = await service.findByItem('item-1');

      expect(entry.member).toBeNull();
      expect(entry.actionType).toBe(ActionType.TAKEN);
    });

    it("renvoie une liste vide quand rien n'a été fait", async () => {
      historyRepo.find.mockResolvedValue([]);

      await expect(service.findByItem('item-1')).resolves.toEqual([]);
    });
  });
});
