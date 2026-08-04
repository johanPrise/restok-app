import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Member, MemberRole } from '../members/entities/member.entity';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

describe('AuthService', () => {
  let service: AuthService;
  let memberRepo: jest.Mocked<Repository<Member>>;
  let tokenService: jest.Mocked<TokenService>;

  const buildMember = (overrides: Partial<Member> = {}): Member =>
    ({
      id: 'member-1',
      name: 'Yorick',
      email: 'yorick@test.dev',
      password: 'hashed',
      role: MemberRole.MEMBER,
      groupId: null,
      pushToken: null,
      ...overrides,
    }) as Member;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Member),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn((dto: Partial<Member>) => dto as Member),
            save: jest.fn(),
          },
        },
        {
          provide: TokenService,
          useValue: { issue: jest.fn(() => 'signed.jwt') },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    memberRepo = moduleRef.get(getRepositoryToken(Member));
    tokenService = moduleRef.get(TokenService);
  });

  describe('register', () => {
    it('hashe le mot de passe avant de le persister', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      memberRepo.save.mockImplementation((m) =>
        Promise.resolve(buildMember(m as Partial<Member>)),
      );

      await service.register({
        name: 'Yorick',
        email: 'yorick@test.dev',
        password: 'motdepasse123',
      });

      const saved = memberRepo.save.mock.calls[0][0] as Member;
      expect(saved.password).not.toBe('motdepasse123');
      await expect(
        bcrypt.compare('motdepasse123', saved.password),
      ).resolves.toBe(true);
    });

    it("crée le membre sans groupe et avec le rôle 'member'", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      memberRepo.save.mockImplementation((m) =>
        Promise.resolve(buildMember(m as Partial<Member>)),
      );

      await service.register({
        name: 'Yorick',
        email: 'yorick@test.dev',
        password: 'motdepasse123',
      });

      const saved = memberRepo.save.mock.calls[0][0] as Member;
      expect(saved.groupId).toBeNull();
      expect(saved.role).toBe(MemberRole.MEMBER);
    });

    it('rejette un email déjà utilisé', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember());

      await expect(
        service.register({
          name: 'Yorick',
          email: 'yorick@test.dev',
          password: 'motdepasse123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(memberRepo.save).not.toHaveBeenCalled();
    });

    it('ne renvoie jamais le hash du mot de passe', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      memberRepo.save.mockImplementation((m) =>
        Promise.resolve(buildMember(m as Partial<Member>)),
      );

      const result = await service.register({
        name: 'Yorick',
        email: 'yorick@test.dev',
        password: 'motdepasse123',
      });

      expect(result.member).not.toHaveProperty('password');
    });
  });

  describe('login', () => {
    it('renvoie un token quand les identifiants sont valides', async () => {
      const password = await bcrypt.hash('motdepasse123', 10);
      memberRepo.findOne.mockResolvedValue(buildMember({ password }));

      const result = await service.login({
        email: 'yorick@test.dev',
        password: 'motdepasse123',
      });

      expect(result.accessToken).toBe('signed.jwt');
    });

    it('rejette un mot de passe incorrect', async () => {
      const password = await bcrypt.hash('motdepasse123', 10);
      memberRepo.findOne.mockResolvedValue(buildMember({ password }));

      await expect(
        service.login({ email: 'yorick@test.dev', password: 'faux' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejette un email inconnu avec le même message', async () => {
      memberRepo.findOne.mockResolvedValue(null);

      // Message identique au cas "mauvais mot de passe" : ne pas révéler
      // quels emails existent.
      await expect(
        service.login({ email: 'inconnu@test.dev', password: 'motdepasse123' }),
      ).rejects.toThrow('Email ou mot de passe incorrect');
    });
  });

  describe('émission du token', () => {
    it("ne transmet que l'identifiant du membre", async () => {
      const password = await bcrypt.hash('motdepasse123', 10);
      memberRepo.findOne.mockResolvedValue(
        buildMember({ password, groupId: 'group-1', role: MemberRole.ADMIN }),
      );

      await service.login({
        email: 'yorick@test.dev',
        password: 'motdepasse123',
      });

      // Ni groupId ni role : ils sont relus en base par JwtStrategy.
      expect(tokenService.issue).toHaveBeenCalledWith('member-1');
    });
  });
});
