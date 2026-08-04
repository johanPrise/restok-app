import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Member, MemberRole } from '../../members/entities/member.entity';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let memberRepo: jest.Mocked<Repository<Member>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn(() => 'secret-de-test') },
        },
        {
          provide: getRepositoryToken(Member),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
    memberRepo = moduleRef.get(getRepositoryToken(Member));
  });

  it('résout les droits en base, pas depuis le token', async () => {
    memberRepo.findOne.mockResolvedValue({
      id: 'member-1',
      groupId: 'group-1',
      role: MemberRole.ADMIN,
    } as Member);

    await expect(strategy.validate({ sub: 'member-1' })).resolves.toEqual({
      id: 'member-1',
      groupId: 'group-1',
      role: MemberRole.ADMIN,
    });
    expect(memberRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'member-1' } }),
    );
  });

  it('reflète immédiatement un retrait de groupe', async () => {
    // Même token qu'avant le retrait, mais la base fait foi.
    memberRepo.findOne.mockResolvedValue({
      id: 'member-1',
      groupId: null,
      role: MemberRole.MEMBER,
    } as Member);

    await expect(strategy.validate({ sub: 'member-1' })).resolves.toMatchObject(
      { groupId: null },
    );
  });

  it('rejette un membre inexistant ou soft-deleted', async () => {
    // findOne exclut les soft-deleted : le token d'un compte supprimé meurt
    // avec lui.
    memberRepo.findOne.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 'supprime' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('ne sélectionne pas le hash du mot de passe', async () => {
    memberRepo.findOne.mockResolvedValue({
      id: 'member-1',
      groupId: null,
      role: MemberRole.MEMBER,
    } as Member);

    await strategy.validate({ sub: 'member-1' });

    const options = memberRepo.findOne.mock.calls[0][0];
    expect(options.select).toEqual({ id: true, groupId: true, role: true });
  });
});
