import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { LessThan, Repository } from 'typeorm';
import { badRequest, BUSINESS_CODES } from '../common/business-error';
import { generateInviteCode } from '../groups/invite-code';
import { MAIL_PROVIDER } from '../mail/mail-provider.interface';
import type { MailProvider } from '../mail/mail-provider.interface';
import { Member } from '../members/entities/member.entity';
import { PasswordReset } from './entities/password-reset.entity';

/**
 * Un quart d'heure. Assez pour aller chercher un email, trop peu pour qu'un
 * code oublié dans une boîte traîne longtemps.
 */
const TTL_MS = 15 * 60 * 1000;

/** Au-delà, on brûle la demande plutôt que de laisser essayer. */
const MAX_ATTEMPTS = 5;

/** Le même coût que les mots de passe, pour la même raison. */
const BCRYPT_ROUNDS = 10;

/**
 * « Mot de passe oublié », de bout en bout.
 *
 * C'était le trou le plus grave du projet : l'email est l'identifiant de
 * connexion, et le changer exige justement le mot de passe. Quelqu'un qui
 * l'oubliait était enfermé dehors définitivement.
 *
 * Le code reprend l'alphabet des invitations — sans I, O, 0 ni 1 — parce qu'il
 * est recopié à la main depuis une boîte mail, et que l'app sait déjà le
 * demander : `CodeInput` existe.
 */
@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordReset)
    private readonly resetRepo: Repository<PasswordReset>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @Inject(MAIL_PROVIDER) private readonly mail: MailProvider,
  ) {}

  /**
   * Ouvre une demande, et ne dit jamais si le compte existe.
   *
   * Répondre « adresse inconnue » transformerait cette route en annuaire :
   * n'importe qui saurait qui a un compte. L'appelant reçoit donc la même
   * réponse dans tous les cas, et seul le propriétaire de la boîte voit la
   * différence.
   */
  async request(email: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!member) return;

    // Une seule demande vivante à la fois : deux codes valides doublent la
    // surface d'attaque sans rien apporter à qui les demande.
    await this.resetRepo.delete({ memberId: member.id });

    const code = generateInviteCode();

    await this.resetRepo.save(
      this.resetRepo.create({
        memberId: member.id,
        codeHash: await bcrypt.hash(code, BCRYPT_ROUNDS),
        expiresAt: new Date(Date.now() + TTL_MS),
      }),
    );

    await this.mail.send({
      to: member.email,
      subject: 'Ton code Restock',
      text: [
        `Bonjour ${member.name},`,
        '',
        `Voici le code pour choisir un nouveau mot de passe : ${code}`,
        '',
        'Il vaut un quart d’heure. Si tu n’as rien demandé, ignore ce message —',
        'ton mot de passe actuel reste valable.',
      ].join('\n'),
    });
  }

  /**
   * Valide un code et rend l'identifiant du membre.
   *
   * Chaque échec est compté sur la demande elle-même : le plafond de débit
   * compte par adresse IP, celui-ci par demande, ce qui ferme la porte à
   * quelqu'un qui répartirait ses essais sur plusieurs machines.
   */
  async consume(email: string, code: string): Promise<string> {
    const member = await this.memberRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    // Même refus qu'un code faux : distinguer les deux dirait si le compte
    // existe, ce que la première route s'est justement refusée à dire.
    if (!member) throw this.rejected();

    const reset = await this.resetRepo.findOne({
      where: { memberId: member.id },
    });

    if (!reset || reset.expiresAt.getTime() < Date.now()) throw this.rejected();

    if (reset.attempts >= MAX_ATTEMPTS) {
      await this.resetRepo.delete({ id: reset.id });
      throw this.rejected();
    }

    if (!(await bcrypt.compare(code.trim().toUpperCase(), reset.codeHash))) {
      await this.resetRepo.increment({ id: reset.id }, 'attempts', 1);
      throw this.rejected();
    }

    // Usage unique : le code vient de servir, il ne servira plus.
    await this.resetRepo.delete({ id: reset.id });

    return member.id;
  }

  /**
   * Le ménage des demandes périmées.
   *
   * Elles ne valent plus rien mais s'accumulent. Appelé à chaque nouvelle
   * demande plutôt que par une tâche planifiée : le volume est dérisoire, et
   * une tâche de plus se serait ajoutée au démarrage pour presque rien.
   */
  async purgeExpired(): Promise<void> {
    await this.resetRepo.delete({ expiresAt: LessThan(new Date()) });
  }

  /**
   * Un seul refus pour tous les cas — code faux, expiré, épuisé, compte
   * inconnu. Les distinguer apprendrait à un attaquant où il en est.
   */
  private rejected() {
    return badRequest(
      BUSINESS_CODES.RESET_CODE_INVALID,
      'Ce code n’est pas valable, ou il a expiré. Redemande-en un.',
    );
  }
}
