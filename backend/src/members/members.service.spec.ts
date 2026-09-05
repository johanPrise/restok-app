import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager, Repository, UpdateResult } from 'typeorm';
import { RefreshTokenService } from '../auth/refresh-token.service';
import { GroupsService } from '../groups/groups.service';
import { Member, MemberRole } from './entities/member.entity';
import { MembersService } from './members.service';

describe('MembersService', () => {
  let service: MembersService;
  let memberRepo: jest.Mocked<Repository<Member>>;
  let groupsService: jest.Mocked<Pick<GroupsService, 'removeWithin'>>;
  let refreshTokens: jest.Mocked<Pick<RefreshTokenService, 'revokeAllFor'>>;

  const buildMember = (overrides: Partial<Member> = {}): Member =>
    ({
      id: 'member-2',
      name: 'Ada',
      email: 'ada@test.dev',
      role: MemberRole.MEMBER,
      groupId: 'group-1',
      pushToken: 'ExponentPushToken[xxx]',
      createdAt: new Date('2026-01-01'),
      joinedAt: new Date('2026-01-01'),
      ...overrides,
    }) as Member;

  beforeEach(async () => {
    const repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn((m: Member) => Promise.resolve(m)),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    // Le départ et la suppression travaillent dans une transaction : le faux
    // manager rend le même dépôt, ce qui laisse les assertions inchangées.
    const manager = {
      getRepository: () => repo,
    } as unknown as EntityManager;

    const moduleRef = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: getRepositoryToken(Member), useValue: repo },
        {
          provide: GroupsService,
          useValue: { removeWithin: jest.fn() },
        },
        {
          provide: RefreshTokenService,
          useValue: { revokeAllFor: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: (run: (m: EntityManager) => Promise<unknown>) =>
              run(manager),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(MembersService);
    memberRepo = moduleRef.get(getRepositoryToken(Member));
    groupsService = moduleRef.get(GroupsService);
    refreshTokens = moduleRef.get(RefreshTokenService);
  });

  describe('findAllInGroup', () => {
    it("n'expose pas le push token aux autres membres", async () => {
      memberRepo.find.mockResolvedValue([buildMember()]);

      const [member] = await service.findAllInGroup('group-1');

      expect(member).not.toHaveProperty('pushToken');
      expect(member).not.toHaveProperty('password');
    });
  });

  describe('removeFromGroup', () => {
    it('détache le membre sans supprimer son compte', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember());

      await service.removeFromGroup('member-2', 'admin-1', 'group-1');

      const saved = memberRepo.save.mock.calls[0][0] as Member;
      expect(saved.groupId).toBeNull();
      expect(saved.role).toBe(MemberRole.MEMBER);
    });

    it('empêche un admin de se retirer lui-même', async () => {
      await expect(
        service.removeFromGroup('admin-1', 'admin-1', 'group-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(memberRepo.findOne).not.toHaveBeenCalled();
    });

    it("rejette un membre d'un autre groupe", async () => {
      // findOne filtre sur { id, groupId } — un membre hors groupe ne remonte pas.
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeFromGroup('member-99', 'admin-1', 'group-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(memberRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('leaveGroup', () => {
    /** Le groupe tel que `departFrom` le relit, celui qui part compris. */
    const groupOf = (...members: Member[]) =>
      memberRepo.find.mockResolvedValue(members);

    it('détache un simple membre sans supprimer son compte', async () => {
      const partant = buildMember();
      memberRepo.findOne.mockResolvedValue(partant);
      groupOf(partant, buildMember({ id: 'admin-1', role: MemberRole.ADMIN }));

      await service.leaveGroup('member-2', 'group-1');

      expect(memberRepo.update).toHaveBeenCalledWith('member-2', {
        groupId: null,
        role: MemberRole.MEMBER,
        joinedAt: null,
      });
      expect(memberRepo.softDelete).not.toHaveBeenCalled();
    });

    it('ne transmet rien tant qu’il reste un autre admin', async () => {
      const partant = buildMember({ id: 'admin-1', role: MemberRole.ADMIN });
      memberRepo.findOne.mockResolvedValue(partant);
      groupOf(partant, buildMember({ id: 'admin-2', role: MemberRole.ADMIN }));

      await service.leaveGroup('admin-1', 'group-1');

      // Une seule écriture : le détachement du partant.
      expect(memberRepo.update).toHaveBeenCalledTimes(1);
    });

    it('repart simple membre — son grade ne le suit pas ailleurs', async () => {
      const partant = buildMember({ id: 'admin-1', role: MemberRole.ADMIN });
      memberRepo.findOne.mockResolvedValue(partant);
      groupOf(partant, buildMember({ id: 'admin-2', role: MemberRole.ADMIN }));

      await service.leaveGroup('admin-1', 'group-1');

      expect(memberRepo.update).toHaveBeenCalledWith(
        'admin-1',
        expect.objectContaining({ role: MemberRole.MEMBER }),
      );
    });

    describe('quand c’est le dernier admin', () => {
      const partant = () =>
        buildMember({ id: 'admin-1', role: MemberRole.ADMIN });

      it('ne le retient pas', async () => {
        const admin = partant();
        memberRepo.findOne.mockResolvedValue(admin);
        groupOf(admin, buildMember({ id: 'member-2' }));

        // Cette méthode opposait ici un refus. Il tenait tant qu'on pouvait
        // choisir de rester ; la suppression de compte l'a rendu intenable.
        await expect(
          service.leaveGroup('admin-1', 'group-1'),
        ).resolves.toBeUndefined();
      });

      it('promeut le membre présent depuis le plus longtemps', async () => {
        const admin = partant();
        memberRepo.findOne.mockResolvedValue(admin);
        groupOf(
          admin,
          buildMember({ id: 'recent', joinedAt: new Date('2026-06-01') }),
          buildMember({ id: 'ancien', joinedAt: new Date('2026-02-01') }),
        );

        await service.leaveGroup('admin-1', 'group-1');

        expect(memberRepo.update).toHaveBeenCalledWith('ancien', {
          role: MemberRole.ADMIN,
        });
      });

      it('ne laisse jamais un groupe sans personne aux commandes', async () => {
        const admin = partant();
        memberRepo.findOne.mockResolvedValue(admin);
        groupOf(admin, buildMember({ id: 'member-2' }));

        await service.leaveGroup('admin-1', 'group-1');

        // Le cul-de-sac de Telegram — un groupe dont plus personne ne peut
        // rien faire — est le seul état qu'on refuse d'atteindre.
        const promus = memberRepo.update.mock.calls.filter(
          ([, patch]) => (patch as Partial<Member>).role === MemberRole.ADMIN,
        );
        expect(promus).toHaveLength(1);
      });
    });

    it('emporte le groupe quand le dernier membre s’en va', async () => {
      const seul = buildMember({ id: 'admin-1', role: MemberRole.ADMIN });
      memberRepo.findOne.mockResolvedValue(seul);
      groupOf(seul);

      await service.leaveGroup('admin-1', 'group-1');

      // Le laisser derrière fabriquait un groupe vide que plus personne ne
      // pouvait ni rouvrir ni supprimer, avec son nom et ses items.
      expect(groupsService.removeWithin).toHaveBeenCalledWith(
        expect.anything(),
        'group-1',
      );
    });

    it("rejette quelqu'un qui n'est pas du groupe", async () => {
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.leaveGroup('member-99', 'group-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteAccount', () => {
    it('soft-delete le compte', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember({ groupId: null }));

      await service.deleteAccount('member-2');

      // Soft et non hard : c'est ce qui rend le journal anonyme sans le
      // trouer. Les lectures du registre ignorent déjà les membres supprimés.
      expect(memberRepo.softDelete).toHaveBeenCalledWith('member-2');
    });

    it('brouille l’email pour ne pas transformer un départ en bannissement', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember({ groupId: null }));

      await service.deleteAccount('member-2');

      const [, patch] = memberRepo.update.mock.calls[0] as [
        string,
        Partial<Member>,
      ];
      // L'email est unique en base : le laisser interdirait de se réinscrire
      // avec la même adresse.
      expect(patch.email).not.toBe('ada@test.dev');
      expect(patch.pushToken).toBeNull();
    });

    it('coupe les sessions longues', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember({ groupId: null }));

      await service.deleteAccount('member-2');

      // Sinon un refresh token survivrait deux mois à un compte disparu.
      expect(refreshTokens.revokeAllFor).toHaveBeenCalledWith('member-2');
    });

    it('marche sans groupe — on doit pouvoir défaire une inscription', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember({ groupId: null }));

      await service.deleteAccount('member-2');

      expect(memberRepo.find).not.toHaveBeenCalled();
      expect(groupsService.removeWithin).not.toHaveBeenCalled();
    });

    it('transmet les clés avant de partir', async () => {
      const admin = buildMember({ id: 'admin-1', role: MemberRole.ADMIN });
      memberRepo.findOne.mockResolvedValue(admin);
      memberRepo.find.mockResolvedValue([
        admin,
        buildMember({ id: 'ancien', joinedAt: new Date('2026-02-01') }),
      ]);

      await service.deleteAccount('admin-1');

      expect(memberRepo.update).toHaveBeenCalledWith('ancien', {
        role: MemberRole.ADMIN,
      });
    });

    it('emporte le groupe quand il n’y avait personne d’autre', async () => {
      const seul = buildMember({ id: 'admin-1', role: MemberRole.ADMIN });
      memberRepo.findOne.mockResolvedValue(seul);
      memberRepo.find.mockResolvedValue([seul]);

      await service.deleteAccount('admin-1');

      expect(groupsService.removeWithin).toHaveBeenCalledWith(
        expect.anything(),
        'group-1',
      );
    });

    it('rejette un membre introuvable', async () => {
      memberRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteAccount('member-99')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(memberRepo.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('setRole', () => {
    it('promeut un membre', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember());

      const updated = await service.setRole(
        'member-2',
        'admin-1',
        'group-1',
        MemberRole.ADMIN,
      );

      expect(updated.role).toBe(MemberRole.ADMIN);
      expect(updated).not.toHaveProperty('pushToken');
    });

    it('refuse de changer son propre rôle', async () => {
      await expect(
        service.setRole('admin-1', 'admin-1', 'group-1', MemberRole.MEMBER),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(memberRepo.findOne).not.toHaveBeenCalled();
    });

    it("rejette un membre d'un autre groupe", async () => {
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setRole('member-99', 'admin-1', 'group-1', MemberRole.ADMIN),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(memberRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('updatePushToken', () => {
    it('enregistre le token', async () => {
      memberRepo.update.mockResolvedValue({ affected: 1 } as UpdateResult);

      await service.updatePushToken('member-1', 'ExponentPushToken[abc]');

      expect(memberRepo.update).toHaveBeenCalledWith('member-1', {
        pushToken: 'ExponentPushToken[abc]',
      });
    });

    it('rejette un membre introuvable', async () => {
      memberRepo.update.mockResolvedValue({ affected: 0 } as UpdateResult);

      await expect(
        service.updatePushToken('inconnu', 'ExponentPushToken[abc]'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
