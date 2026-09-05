import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokenService } from './refresh-token.service';

/** Ce que le service va chercher en base à partir du token présenté. */
const sha256 = (token: string) =>
  createHash('sha256').update(token).digest('hex');

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let repo: jest.Mocked<Repository<RefreshToken>>;

  const buildRow = (overrides: Partial<RefreshToken> = {}): RefreshToken =>
    ({
      id: 'token-1',
      memberId: 'member-1',
      tokenHash: sha256('presente'),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedById: null,
      ...overrides,
    }) as RefreshToken;

  beforeEach(async () => {
    let minted = 0;

    const moduleRef = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn((dto: Partial<RefreshToken>) => dto),
            save: jest.fn((row: Partial<RefreshToken>) =>
              Promise.resolve({ ...row, id: `neuf-${++minted}` }),
            ),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
      ],
    }).compile();

    service = moduleRef.get(RefreshTokenService);
    repo = moduleRef.get(getRepositoryToken(RefreshToken));
  });

  describe('issue', () => {
    it('ne persiste jamais le token en clair', async () => {
      const token = await service.issue('member-1');

      const saved = repo.save.mock.calls[0][0] as Partial<RefreshToken>;
      expect(saved.tokenHash).toBe(sha256(token));
      expect(JSON.stringify(saved)).not.toContain(token);
    });

    it('fait le ménage des lignes périmées au passage', async () => {
      await service.issue('member-1');

      // Pas de tâche planifiée : c'est le seul endroit qui crée des lignes.
      const [criteria] = repo.delete.mock.calls[0] as [Record<string, unknown>];
      expect(criteria).toHaveProperty('expiresAt');
    });

    it('tire un token différent à chaque fois', async () => {
      const [a, b] = await Promise.all([
        service.issue('member-1'),
        service.issue('member-1'),
      ]);

      expect(a).not.toBe(b);
    });
  });

  describe('rotate', () => {
    it('rend un token neuf et consomme celui qui a servi', async () => {
      repo.findOne.mockResolvedValue(buildRow());

      const result = await service.rotate('presente');

      expect(result.memberId).toBe('member-1');
      expect(result.token).not.toBe('presente');

      const [where, patch] = repo.update.mock.calls[0] as [
        { id: string },
        Partial<RefreshToken>,
      ];
      expect(where.id).toBe('token-1');
      expect(patch.replacedById).toBe('neuf-1');
      expect(patch.revokedAt).toBeInstanceOf(Date);
    });

    it('repousse la date de fin — une session active ne se referme pas', async () => {
      repo.findOne.mockResolvedValue(
        buildRow({ expiresAt: new Date(Date.now() + 1_000) }),
      );

      await service.rotate('presente');

      const saved = repo.save.mock.calls[0][0] as Partial<RefreshToken>;
      // Deux mois par défaut, comptés à partir de maintenant et non de la
      // connexion : quelqu'un qui ouvre l'app chaque semaine ne se reconnecte
      // jamais.
      expect(saved.expiresAt!.getTime()).toBeGreaterThan(
        Date.now() + 59 * 24 * 60 * 60 * 1000,
      );
    });

    it('refuse un token inconnu', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.rotate('inconnu')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('refuse un token expiré', async () => {
      repo.findOne.mockResolvedValue(
        buildRow({ expiresAt: new Date(Date.now() - 1) }),
      );

      await expect(service.rotate('presente')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('donne le même refus dans tous les cas', async () => {
      repo.findOne.mockResolvedValue(null);
      const inconnu = await service.rotate('inconnu').catch((e: Error) => e);

      repo.findOne.mockResolvedValue(
        buildRow({ expiresAt: new Date(Date.now() - 1) }),
      );
      const expire = await service.rotate('presente').catch((e: Error) => e);

      // Les distinguer apprendrait à un attaquant où il en est.
      expect((inconnu as Error).message).toBe((expire as Error).message);
    });
  });

  describe('réutilisation', () => {
    it('coupe toutes les sessions du membre quand un token consommé revient', async () => {
      repo.findOne.mockResolvedValue(
        buildRow({
          // Consommé il y a bien plus que la fenêtre de grâce : ce n'est plus
          // une réponse en retard.
          revokedAt: new Date(Date.now() - 5 * 60_000),
          replacedById: 'token-2',
        }),
      );

      await expect(service.rotate('presente')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      // On ignore lequel des deux est le voleur : seul le mot de passe tranche.
      expect(repo.delete).toHaveBeenCalledWith({ memberId: 'member-1' });
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejoue quand la réponse précédente vient de se perdre', async () => {
      repo.findOne.mockResolvedValue(
        buildRow({
          revokedAt: new Date(Date.now() - 2_000),
          replacedById: 'token-2',
        }),
      );

      const result = await service.rotate('presente');

      // Le client n'a jamais reçu son token : le déconnecter pour du mauvais
      // réseau serait exactement le défaut qu'on corrige.
      expect(result.token).toEqual(expect.any(String));
      expect(repo.delete).not.toHaveBeenCalledWith({ memberId: 'member-1' });
    });

    it('coupe au passage le remplaçant que personne ne détient', async () => {
      repo.findOne.mockResolvedValue(
        buildRow({
          revokedAt: new Date(Date.now() - 2_000),
          replacedById: 'token-2',
        }),
      );

      await service.rotate('presente');

      // Sans ça la session traînerait deux tokens vivants, dont un perdu.
      const [where, patch] = repo.update.mock.calls[0] as [
        { id: string },
        Partial<RefreshToken>,
      ];
      expect(where.id).toBe('token-2');
      expect(patch.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('après une déconnexion', () => {
    it('refuse un token révoqué sans remplaçant', async () => {
      repo.findOne.mockResolvedValue(
        buildRow({ revokedAt: new Date(), replacedById: null }),
      );

      // Une déconnexion pose `revoked_at` à maintenant : sans ce cas d'abord,
      // toute déconnexion tomberait dans la fenêtre de grâce et rendrait un
      // token neuf. Se déconnecter n'aurait tenu que trente secondes.
      await expect(service.rotate('presente')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("ne crie pas au vol : c'est une fermeture volontaire", async () => {
      repo.findOne.mockResolvedValue(
        buildRow({ revokedAt: new Date(Date.now() - 60 * 60_000) }),
      );

      await service.rotate('presente').catch(() => undefined);

      expect(repo.delete).not.toHaveBeenCalledWith({ memberId: 'member-1' });
    });
  });

  describe('revoke', () => {
    it('ne touche qu’une session encore ouverte', async () => {
      await service.revoke('presente');

      const [where, patch] = repo.update.mock.calls[0] as [
        { tokenHash: string; revokedAt: unknown },
        Partial<RefreshToken>,
      ];
      expect(where.tokenHash).toBe(sha256('presente'));
      // `IsNull()` : une session déjà fermée ne se referme pas une seconde fois.
      expect(where.revokedAt).toBeDefined();
      expect(patch.revokedAt).toBeInstanceOf(Date);
    });

    it('reste muet sur un token inconnu', async () => {
      repo.update.mockResolvedValue({
        affected: 0,
        raw: [],
        generatedMaps: [],
      });

      // Répondre « ce token n'existe pas » apprendrait lesquels existent.
      await expect(service.revoke('inconnu')).resolves.toBeUndefined();
    });
  });

  describe('revokeAllFor', () => {
    it('efface au lieu de révoquer', async () => {
      await service.revokeAllFor('member-1');

      // Il n'y a rien à détecter plus tard sur des sessions qu'on ferme
      // soi-même en connaissance de cause.
      expect(repo.delete).toHaveBeenCalledWith({ memberId: 'member-1' });
    });
  });
});
