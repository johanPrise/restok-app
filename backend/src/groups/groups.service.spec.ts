import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EntitlementsService } from '../billing/entitlements.service';
import { Item } from '../items/entities/item.entity';
import { Member, MemberRole } from '../members/entities/member.entity';
import { Group, GroupType } from './entities/group.entity';
import { GroupsService } from './groups.service';

describe('GroupsService', () => {
  let service: GroupsService;

  // Repos utilisés *dans* la transaction, résolus via manager.getRepository().
  let txGroupRepo: {
    create: jest.Mock<Group, [Partial<Group>]>;
    save: jest.Mock<Promise<Group>, [Group]>;
    findOne: jest.Mock<Promise<Group | null>, [unknown]>;
    exists: jest.Mock<Promise<boolean>, [{ withDeleted?: boolean }]>;
    softRemove: jest.Mock;
  };
  let txMemberRepo: {
    findOne: jest.Mock<Promise<Member | null>, [unknown]>;
    save: jest.Mock<Promise<Member>, [Member]>;
    update: jest.Mock;
    count: jest.Mock;
  };
  let txItemRepo: { softDelete: jest.Mock };
  let entitlements: { isUnlocked: jest.Mock };

  const buildMember = (overrides: Partial<Member> = {}): Member =>
    ({
      id: 'member-1',
      name: 'Yorick',
      email: 'yorick@test.dev',
      role: MemberRole.MEMBER,
      groupId: null,
      ...overrides,
    }) as Member;

  beforeEach(async () => {
    txGroupRepo = {
      create: jest.fn((dto: Partial<Group>) => dto as Group),
      save: jest.fn((g: Group) => Promise.resolve({ id: 'group-1', ...g })),
      findOne: jest.fn<Promise<Group | null>, [unknown]>(),
      exists: jest
        .fn<Promise<boolean>, [{ withDeleted?: boolean }]>()
        .mockResolvedValue(false),
      softRemove: jest.fn(),
    };
    txMemberRepo = {
      findOne: jest.fn<Promise<Member | null>, [unknown]>(),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn((m: Member) => Promise.resolve(m)),
      update: jest.fn(),
    };
    txItemRepo = { softDelete: jest.fn() };

    const manager = {
      getRepository: (entity: unknown) => {
        if (entity === Group) return txGroupRepo;
        if (entity === Member) return txMemberRepo;
        if (entity === Item) return txItemRepo;
        throw new Error('entité non mockée');
      },
    } as unknown as EntityManager;

    const moduleRef = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((cb: (m: EntityManager) => Promise<unknown>) =>
              cb(manager),
            ),
          },
        },
        {
          provide: getRepositoryToken(Group),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Member),
          useValue: { countBy: jest.fn() },
        },
        {
          // Débloqué par défaut : ces tests portent sur la vie du groupe, pas
          // sur le palier. Le plafond de membres a ses propres cas plus bas.
          provide: EntitlementsService,
          useValue: { isUnlocked: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    service = moduleRef.get(GroupsService);
    entitlements = moduleRef.get(EntitlementsService);
  });

  describe('create', () => {
    it('promeut le créateur admin et le rattache au groupe', async () => {
      txMemberRepo.findOne.mockResolvedValue(buildMember());

      await service.create({ name: 'Coloc' }, 'member-1');

      const saved = txMemberRepo.save.mock.calls[0][0];
      expect(saved.role).toBe(MemberRole.ADMIN);
      expect(saved.groupId).toBe('group-1');
    });

    it("génère un code d'invitation de 8 caractères non ambigus", async () => {
      txMemberRepo.findOne.mockResolvedValue(buildMember());

      await service.create({ name: 'Coloc' }, 'member-1');

      const created = txGroupRepo.create.mock.calls[0][0] as Group;
      expect(created.inviteCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{8}$/);
    });

    it('retente si le code est déjà pris, en comptant les groupes supprimés', async () => {
      txMemberRepo.findOne.mockResolvedValue(buildMember());
      txGroupRepo.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await service.create({ name: 'Coloc' }, 'member-1');

      expect(txGroupRepo.exists).toHaveBeenCalledTimes(2);
      expect(txGroupRepo.exists.mock.calls[0][0]).toMatchObject({
        withDeleted: true,
      });
    });

    it('applique le type roommates par défaut', async () => {
      txMemberRepo.findOne.mockResolvedValue(buildMember());

      await service.create({ name: 'Coloc' }, 'member-1');

      const created = txGroupRepo.create.mock.calls[0][0] as Group;
      expect(created.type).toBe(GroupType.ROOMMATES);
    });

    it('renvoie le groupe créé', async () => {
      txMemberRepo.findOne.mockResolvedValue(buildMember());

      const group = await service.create({ name: 'Coloc' }, 'member-1');

      expect(group).toMatchObject({ id: 'group-1', name: 'Coloc' });
    });

    it('refuse si le membre appartient déjà à un groupe', async () => {
      txMemberRepo.findOne.mockResolvedValue(
        buildMember({ groupId: 'group-existant' }),
      );

      await expect(
        service.create({ name: 'Coloc' }, 'member-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(txGroupRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('join', () => {
    it('rattache le membre au groupe avec le rôle member', async () => {
      txMemberRepo.findOne.mockResolvedValue(buildMember());
      txGroupRepo.findOne.mockResolvedValue({ id: 'group-1' });

      await service.join({ inviteCode: 'AB2CD3EF' }, 'member-1');

      const saved = txMemberRepo.save.mock.calls[0][0];
      expect(saved.groupId).toBe('group-1');
      expect(saved.role).toBe(MemberRole.MEMBER);
    });

    it('normalise le code saisi (casse et espaces)', async () => {
      txMemberRepo.findOne.mockResolvedValue(buildMember());
      txGroupRepo.findOne.mockResolvedValue({ id: 'group-1' });

      await service.join({ inviteCode: ' ab2cd3ef ' }, 'member-1');

      expect(txGroupRepo.findOne).toHaveBeenCalledWith({
        where: { inviteCode: 'AB2CD3EF' },
      });
    });

    it('rejette un code inconnu', async () => {
      txMemberRepo.findOne.mockResolvedValue(buildMember());
      txGroupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.join({ inviteCode: 'ZZZZZZZZ' }, 'member-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(txMemberRepo.save).not.toHaveBeenCalled();
    });

    it('refuse si le membre appartient déjà à un groupe', async () => {
      txMemberRepo.findOne.mockResolvedValue(
        buildMember({ groupId: 'group-existant' }),
      );

      await expect(
        service.join({ inviteCode: 'AB2CD3EF' }, 'member-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('renvoie le groupe rejoint', async () => {
      txMemberRepo.findOne.mockResolvedValue(buildMember());
      txGroupRepo.findOne.mockResolvedValue({ id: 'group-1' } as Group);

      await expect(
        service.join({ inviteCode: 'AB2CD3EF' }, 'member-1'),
      ).resolves.toMatchObject({ id: 'group-1' });
    });
  });

  describe('le plafond de membres', () => {
    beforeEach(() => {
      entitlements.isUnlocked.mockResolvedValue(false);
      txMemberRepo.findOne.mockResolvedValue(buildMember());
      txGroupRepo.findOne.mockResolvedValue({
        id: 'group-1',
        type: GroupType.ROOMMATES,
      } as Group);
    });

    it('laisse entrer tant qu’on est moins de six', async () => {
      txMemberRepo.count.mockResolvedValue(5);

      await expect(
        service.join({ inviteCode: 'ABCD2345' }, 'member-1'),
      ).resolves.toBeDefined();
    });

    it('refuse le septième', async () => {
      txMemberRepo.count.mockResolvedValue(6);

      await expect(
        service.join({ inviteCode: 'ABCD2345' }, 'member-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(txMemberRepo.save).not.toHaveBeenCalled();
    });

    it('ne s’applique pas à un groupe qui a payé', async () => {
      entitlements.isUnlocked.mockResolvedValue(true);
      txMemberRepo.count.mockResolvedValue(50);

      await expect(
        service.join({ inviteCode: 'ABCD2345' }, 'member-1'),
      ).resolves.toBeDefined();
    });
  });

  describe('remove', () => {
    it('soft-delete le groupe, ses items, et détache les membres', async () => {
      txGroupRepo.findOne.mockResolvedValue({ id: 'group-1' });

      await service.remove('group-1');

      expect(txItemRepo.softDelete).toHaveBeenCalledWith({
        groupId: 'group-1',
      });
      expect(txMemberRepo.update).toHaveBeenCalledWith(
        { groupId: 'group-1' },
        // `joinedAt` suit `groupId` : hors d'un groupe, il n'y a rien à dater,
        // et une date qui traîne fausserait la succession du groupe suivant.
        { groupId: null, role: MemberRole.MEMBER, joinedAt: null },
      );
      expect(txGroupRepo.softRemove).toHaveBeenCalled();
    });

    it('rejette un groupe introuvable', async () => {
      txGroupRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('group-inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(txGroupRepo.softRemove).not.toHaveBeenCalled();
    });
  });

  describe('findMine', () => {
    it('renvoie le groupe enrichi du nombre de membres', async () => {
      const groupRepo = service['groupRepo'] as jest.Mocked<Repository<Group>>;
      const memberRepo = service['memberRepo'] as jest.Mocked<
        Repository<Member>
      >;
      groupRepo.findOne.mockResolvedValue({
        id: 'group-1',
        name: 'Coloc',
      } as Group);
      memberRepo.countBy.mockResolvedValue(3);

      await expect(service.findMine('group-1')).resolves.toMatchObject({
        id: 'group-1',
        memberCount: 3,
      });
    });
  });
});
