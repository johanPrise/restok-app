import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository, UpdateResult } from 'typeorm';
import { Member, MemberRole } from './entities/member.entity';
import { MembersService } from './members.service';

describe('MembersService', () => {
  let service: MembersService;
  let memberRepo: jest.Mocked<Repository<Member>>;

  const buildMember = (overrides: Partial<Member> = {}): Member =>
    ({
      id: 'member-2',
      name: 'Ada',
      email: 'ada@test.dev',
      role: MemberRole.MEMBER,
      groupId: 'group-1',
      pushToken: 'ExponentPushToken[xxx]',
      createdAt: new Date('2026-01-01'),
      ...overrides,
    }) as Member;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MembersService,
        {
          provide: getRepositoryToken(Member),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            save: jest.fn((m: Member) => Promise.resolve(m)),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(MembersService);
    memberRepo = moduleRef.get(getRepositoryToken(Member));
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
    it('détache un simple membre sans supprimer son compte', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember());

      await service.leaveGroup('member-2', 'group-1');

      const saved = memberRepo.save.mock.calls[0][0] as Member;
      expect(saved.groupId).toBeNull();
      expect(memberRepo.count).not.toHaveBeenCalled();
    });

    it('laisse partir un admin tant qu’il en reste un autre', async () => {
      memberRepo.findOne.mockResolvedValue(
        buildMember({ id: 'admin-1', role: MemberRole.ADMIN }),
      );
      // deux admins sur trois membres
      memberRepo.count.mockResolvedValueOnce(2).mockResolvedValueOnce(3);

      await service.leaveGroup('admin-1', 'group-1');

      const saved = memberRepo.save.mock.calls[0][0] as Member;
      expect(saved.groupId).toBeNull();
      // Il repart simple membre : son ancien grade ne le suit pas ailleurs.
      expect(saved.role).toBe(MemberRole.MEMBER);
    });

    it('retient le dernier admin quand il laisse du monde derrière lui', async () => {
      // Sinon le groupe se retrouve sans personne pour ajouter un item ni
      // accepter un nouveau membre.
      memberRepo.findOne.mockResolvedValue(
        buildMember({ id: 'admin-1', role: MemberRole.ADMIN }),
      );
      memberRepo.count.mockResolvedValueOnce(1).mockResolvedValueOnce(3);

      await expect(
        service.leaveGroup('admin-1', 'group-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(memberRepo.save).not.toHaveBeenCalled();
    });

    it('laisse partir un admin seul dans son groupe', async () => {
      // Il ne bloque personne : le retenir n'aurait aucun bénéficiaire.
      memberRepo.findOne.mockResolvedValue(
        buildMember({ id: 'admin-1', role: MemberRole.ADMIN }),
      );
      memberRepo.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      await service.leaveGroup('admin-1', 'group-1');

      const saved = memberRepo.save.mock.calls[0][0] as Member;
      expect(saved.groupId).toBeNull();
    });

    it("rejette quelqu'un qui n'est pas du groupe", async () => {
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.leaveGroup('member-99', 'group-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
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
