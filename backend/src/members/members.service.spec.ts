import { BadRequestException, NotFoundException } from '@nestjs/common';
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
