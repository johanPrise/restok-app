import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { In, Repository } from 'typeorm';
import { Member } from '../members/entities/member.entity';
import { NotificationsService } from './notifications.service';
import {
  DEVICE_NOT_REGISTERED,
  PUSH_PROVIDER,
  PushMessage,
  PushProvider,
} from './providers/push-provider.interface';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let memberRepo: jest.Mocked<Repository<Member>>;
  let pushProvider: jest.Mocked<PushProvider>;

  const buildMember = (id: string, pushToken: string | null): Member =>
    ({ id, name: id, pushToken, groupId: 'group-1' }) as Member;

  const sentMessages = (): PushMessage[] => pushProvider.send.mock.calls[0][0];

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Member),
          useValue: { find: jest.fn(), update: jest.fn() },
        },
        {
          provide: PUSH_PROVIDER,
          useValue: { send: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
    memberRepo = moduleRef.get(getRepositoryToken(Member));
    pushProvider = moduleRef.get(PUSH_PROVIDER);
  });

  describe('ciblage', () => {
    it('ne requiert que les membres ayant un token', async () => {
      memberRepo.find.mockResolvedValue([buildMember('m1', 'tok-1')]);

      await service.notifyGroup('group-1', 'PQ épuisé');

      expect(memberRepo.find.mock.calls[0][0]).toMatchObject({
        where: { groupId: 'group-1' },
      });
    });

    it("exclut l'auteur de l'action", async () => {
      memberRepo.find.mockResolvedValue([
        buildMember('m1', 'tok-1'),
        buildMember('m2', 'tok-2'),
      ]);

      await service.notifyGroup('group-1', 'PQ épuisé', {
        excludeMemberId: 'm1',
      });

      expect(sentMessages().map((m) => m.to)).toEqual(['tok-2']);
    });

    it("n'appelle pas le provider si personne n'est joignable", async () => {
      memberRepo.find.mockResolvedValue([buildMember('m1', 'tok-1')]);

      await service.notifyGroup('group-1', 'PQ épuisé', {
        excludeMemberId: 'm1',
      });

      expect(pushProvider.send).not.toHaveBeenCalled();
    });

    it('titre et corps du message', async () => {
      memberRepo.find.mockResolvedValue([buildMember('m1', 'tok-1')]);

      await service.notifyGroup('group-1', 'PQ épuisé');

      expect(sentMessages()[0]).toEqual({
        to: 'tok-1',
        title: 'Restock',
        body: 'PQ épuisé',
      });
    });
  });

  describe('nettoyage des tokens', () => {
    beforeEach(() =>
      memberRepo.find.mockResolvedValue([
        buildMember('m1', 'tok-1'),
        buildMember('m2', 'tok-2'),
      ]),
    );

    it('oublie les tokens des appareils désinscrits', async () => {
      pushProvider.send.mockResolvedValue([
        { token: 'tok-1', success: false, error: DEVICE_NOT_REGISTERED },
        { token: 'tok-2', success: true },
      ]);

      await service.notifyGroup('group-1', 'PQ épuisé');

      expect(memberRepo.update).toHaveBeenCalledWith(
        { pushToken: In(['tok-1']) },
        { pushToken: null },
      );
    });

    it('conserve les tokens après un échec réseau', async () => {
      // Un timeout ne dit rien sur la validité du token — l'effacer perdrait
      // définitivement un destinataire joignable.
      pushProvider.send.mockResolvedValue([
        { token: 'tok-1', success: false, error: 'HTTP 503' },
        { token: 'tok-2', success: false, error: 'fetch failed' },
      ]);

      await service.notifyGroup('group-1', 'PQ épuisé');

      expect(memberRepo.update).not.toHaveBeenCalled();
    });

    it("n'écrit rien quand tout passe", async () => {
      pushProvider.send.mockResolvedValue([
        { token: 'tok-1', success: true },
        { token: 'tok-2', success: true },
      ]);

      await service.notifyGroup('group-1', 'PQ épuisé');

      expect(memberRepo.update).not.toHaveBeenCalled();
    });

    it('regroupe les tokens morts en une seule requête', async () => {
      pushProvider.send.mockResolvedValue([
        { token: 'tok-1', success: false, error: DEVICE_NOT_REGISTERED },
        { token: 'tok-2', success: false, error: DEVICE_NOT_REGISTERED },
      ]);

      await service.notifyGroup('group-1', 'PQ épuisé');

      expect(memberRepo.update).toHaveBeenCalledTimes(1);
      expect(memberRepo.update).toHaveBeenCalledWith(
        { pushToken: In(['tok-1', 'tok-2']) },
        { pushToken: null },
      );
    });
  });
});
