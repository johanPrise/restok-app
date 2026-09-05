import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { IsNull, LessThan, Repository } from 'typeorm';
import { BUSINESS_CODES, unauthorized } from '../common/business-error';
import { RefreshToken } from './entities/refresh-token.entity';

/** 256 bits tirés au sort : assez pour qu'aucune recherche exhaustive n'existe. */
const TOKEN_BYTES = 32;

/** Deux mois par défaut, et repoussés à chaque usage — voir `rotate`. */
const DEFAULT_DAYS = 60;

/**
 * La fenêtre pendant laquelle rejouer un token déjà consommé reste une erreur
 * de réseau plutôt qu'un vol.
 *
 * Elle existe parce que la rotation a un angle mort : le serveur consomme le
 * token *avant* que le client reçoive le suivant. Une réponse perdue — un
 * tunnel, un ascenseur, l'app tuée au mauvais moment — laisse donc le client
 * avec un token que le serveur tient déjà pour usé. Sans grâce, il serait
 * déconnecté pour avoir eu du mauvais réseau, ce qui est exactement le défaut
 * qu'on cherchait à corriger.
 *
 * Trente secondes : au-delà, ce n'est plus une réponse en retard.
 */
const GRACE_MS = 30_000;

/**
 * Les sessions longues : émission, rotation, révocation.
 *
 * ## Ce que ça répare
 *
 * L'access token vaut une heure et ne se révoque pas — c'est la contrepartie
 * assumée d'un JWT qu'aucune requête n'a besoin de valider. Mais sans rien
 * derrière, une heure était aussi la durée de la *session* : quelqu'un qui
 * ouvre l'app trente secondes au magasin retapait son mot de passe une fois
 * sur deux.
 *
 * ## La rotation, et ce qu'elle permet de voir
 *
 * Chaque usage consomme le token et en rend un autre. Ce n'est pas une
 * cérémonie : c'est ce qui rend un vol **visible**. Un token volé finit par
 * être présenté deux fois — une fois par le voleur, une fois par le
 * propriétaire — et la seconde présentation d'un token déjà consommé est un
 * signal qu'un token éternel n'aurait jamais donné.
 *
 * On coupe alors **toutes** les sessions du membre : à ce stade on ignore
 * lequel des deux est le voleur, et seul le mot de passe permet de trancher.
 */
@Injectable()
export class RefreshTokenService {
  private readonly ttlMs: number;

  constructor(
    @InjectRepository(RefreshToken)
    private readonly tokenRepo: Repository<RefreshToken>,
    config: ConfigService,
  ) {
    const days =
      Number(config.get<string>('REFRESH_TOKEN_DAYS')) || DEFAULT_DAYS;
    this.ttlMs = days * 24 * 60 * 60 * 1000;
  }

  /**
   * Ouvre une session longue — à la connexion, à l'inscription, après une
   * réinitialisation.
   *
   * Le ménage des lignes périmées se fait ici plutôt que par une tâche
   * planifiée : c'est le seul endroit qui en crée, le volume est dérisoire, et
   * une tâche de plus se serait ajoutée au démarrage pour presque rien.
   */
  async issue(memberId: string): Promise<string> {
    await this.purgeExpired();

    const { token } = await this.mint(memberId);

    return token;
  }

  /**
   * Échange un token contre un neuf, ou refuse.
   *
   * Rend l'identifiant du membre : c'est à l'appelant de relire le compte, qui
   * peut avoir changé de groupe ou de rôle — ou avoir disparu — depuis la
   * connexion.
   */
  async rotate(token: string): Promise<{ memberId: string; token: string }> {
    const existing = await this.tokenRepo.findOne({
      where: { tokenHash: hash(token) },
    });

    // Jamais émis, ou déjà purgé après expiration : il n'y a rien à révoquer,
    // et rien qui distingue cet essai d'un tirage au hasard.
    if (!existing) throw this.rejected();

    if (existing.expiresAt.getTime() < Date.now()) throw this.rejected();

    if (existing.revokedAt) {
      await this.handleReuse(existing);
    }

    const replacement = await this.mint(existing.memberId);

    await this.tokenRepo.update(
      { id: existing.id },
      { revokedAt: new Date(), replacedById: replacement.id },
    );

    return { memberId: existing.memberId, token: replacement.token };
  }

  /**
   * Ferme une session — la déconnexion volontaire.
   *
   * Muet sur un token inconnu : quelqu'un qui se déconnecte a déjà obtenu ce
   * qu'il voulait, et lui répondre « ce token n'existe pas » apprendrait à un
   * tiers lesquels existent.
   */
  async revoke(token: string): Promise<void> {
    await this.tokenRepo.update(
      { tokenHash: hash(token), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /**
   * Coupe toutes les sessions d'un membre.
   *
   * Appelée au changement de mot de passe : `passwordChangedAt` refuse les
   * access tokens antérieurs, mais un refresh token n'est pas un JWT et ne
   * porte pas de date d'émission — il faut aller l'effacer. Sans ça, une
   * réinitialisation laisserait à l'intrus de quoi se refabriquer des access
   * tokens pendant deux mois, c'est-à-dire précisément le contraire de ce
   * qu'elle prétend faire.
   *
   * Effacées et non révoquées : il n'y a rien à détecter plus tard sur des
   * sessions qu'on vient soi-même de fermer en connaissance de cause.
   */
  async revokeAllFor(memberId: string): Promise<void> {
    await this.tokenRepo.delete({ memberId });
  }

  /**
   * Un token déjà révoqué revient. Trois cas, et ils ne se ressemblent pas.
   *
   * **Sans remplaçant** — la session a été fermée exprès : une déconnexion. Il
   * n'y a rien à rejouer et rien à soupçonner, on refuse. C'est ce cas qui
   * impose de regarder `replacedById` d'abord : une déconnexion pose
   * `revoked_at` à maintenant, donc *toute* déconnexion tomberait dans la
   * fenêtre de grâce ci-dessous, qui rendrait un token neuf. Se déconnecter
   * n'aurait alors tenu que trente secondes.
   *
   * **Consommé à l'instant** — la rotation a un angle mort : le serveur
   * consomme le token avant que le client reçoive le suivant. Une réponse
   * perdue laisse donc le client avec un token que le serveur tient pour usé.
   * On rejoue, et on coupe au passage le remplaçant qu'il n'a jamais reçu :
   * sans quoi la session traînerait deux tokens vivants dont un que personne
   * ne détient.
   *
   * **Consommé il y a longtemps** — deux détenteurs pour un token, ce qui
   * n'arrive pas tout seul. On tranche pour le vol, parce que c'est
   * l'hypothèse dont le coût est asymétrique : se tromper vers la déconnexion
   * fait retaper un mot de passe, se tromper vers la confiance laisse un
   * inconnu dans le compte.
   */
  private async handleReuse(existing: RefreshToken): Promise<void> {
    if (!existing.replacedById) throw this.rejected();

    const revokedAt = existing.revokedAt as Date;

    if (Date.now() - revokedAt.getTime() > GRACE_MS) {
      // On ignore lequel des deux détenteurs est le voleur : seul le mot de
      // passe permet de trancher, donc on referme tout et on le redemande.
      await this.revokeAllFor(existing.memberId);
      throw this.rejected();
    }

    await this.tokenRepo.update(
      { id: existing.replacedById, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /** Crée la ligne et rend le token en clair — la seule fois où il existe. */
  private async mint(memberId: string): Promise<{ id: string; token: string }> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');

    const saved = await this.tokenRepo.save(
      this.tokenRepo.create({
        memberId,
        tokenHash: hash(token),
        // Repoussée à chaque rotation : quelqu'un qui ouvre l'app une fois par
        // mois ne se reconnecte jamais, et deux mois de silence la referment.
        expiresAt: new Date(Date.now() + this.ttlMs),
      }),
    );

    return { id: saved.id, token };
  }

  private async purgeExpired(): Promise<void> {
    await this.tokenRepo.delete({ expiresAt: LessThan(new Date()) });
  }

  /**
   * Un seul refus pour tous les cas — inconnu, expiré, volé. Les distinguer
   * apprendrait à un attaquant où il en est.
   */
  private rejected() {
    return unauthorized(
      BUSINESS_CODES.REFRESH_TOKEN_INVALID,
      'Session expirée. Reconnecte-toi.',
    );
  }
}

/**
 * Déterministe, donc indexable — c'est tout ce qu'on lui demande. Voir
 * l'entité pour la raison de ne pas prendre bcrypt ici.
 */
function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
