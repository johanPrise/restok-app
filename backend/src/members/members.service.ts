import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Member, MemberRole } from './entities/member.entity';
import { BUSINESS_CODES, badRequest, conflict } from '../common/business-error';

export interface MemberSummary {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  createdAt: Date;
}

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
  ) {}

  async findAllInGroup(groupId: string): Promise<MemberSummary[]> {
    const members = await this.memberRepo.find({
      where: { groupId },
      order: { role: 'ASC', name: 'ASC' },
    });

    // pushToken n'a aucune raison d'être exposé aux autres membres.
    return members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Retire un membre du groupe — sans supprimer son compte : il redevient un
   * utilisateur sans groupe et peut en rejoindre un autre. Son historique
   * d'actions reste intact.
   */
  async removeFromGroup(
    targetId: string,
    actorId: string,
    groupId: string,
  ): Promise<void> {
    if (targetId === actorId) {
      throw badRequest(
        BUSINESS_CODES.ADMIN_CANNOT_REMOVE_SELF,
        'Un admin ne peut pas se retirer lui-même du groupe',
      );
    }

    const target = await this.memberRepo.findOne({
      where: { id: targetId, groupId },
    });
    if (!target) {
      throw new NotFoundException("Ce membre n'appartient pas à ton groupe");
    }

    target.groupId = null;
    target.role = MemberRole.MEMBER;
    await this.memberRepo.save(target);
  }

  /**
   * Sortie volontaire. Sans elle, personne ne pouvait quitter un groupe de
   * lui-même : `removeFromGroup` est réservée aux admins, et leur interdit de
   * se retirer eux-mêmes.
   *
   * Le dernier admin n'est retenu que s'il **laisse du monde derrière lui** :
   * un groupe sans admin n'a plus personne pour ajouter un item ni accepter
   * quelqu'un. Seul dans son groupe, il ne bloque personne et part librement.
   */
  async leaveGroup(memberId: string, groupId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, groupId },
    });
    if (!member) {
      throw new NotFoundException("Tu n'appartiens pas à ce groupe");
    }

    if (member.role === MemberRole.ADMIN) {
      const [admins, total] = await Promise.all([
        this.memberRepo.count({ where: { groupId, role: MemberRole.ADMIN } }),
        this.memberRepo.count({ where: { groupId } }),
      ]);

      if (admins === 1 && total > 1) {
        throw conflict(
          BUSINESS_CODES.LAST_ADMIN_MUST_HAND_OVER,
          "Tu es le seul admin : nomme quelqu'un d'autre avant de partir, ou supprime le groupe",
        );
      }
    }

    member.groupId = null;
    member.role = MemberRole.MEMBER;
    await this.memberRepo.save(member);
  }

  /**
   * Change le rôle d'un autre membre — c'est ce qui rend la sortie du dernier
   * admin possible.
   *
   * Modifier son propre rôle est refusé, pour la même raison qu'on ne se
   * retire pas soi-même : un admin qui se rétrograde laisserait un groupe sans
   * personne aux commandes.
   */
  async setRole(
    targetId: string,
    actorId: string,
    groupId: string,
    role: MemberRole,
  ): Promise<MemberSummary> {
    if (targetId === actorId) {
      throw badRequest(
        BUSINESS_CODES.ADMIN_CANNOT_CHANGE_OWN_ROLE,
        'Un admin ne change pas son propre rôle',
      );
    }

    const target = await this.memberRepo.findOne({
      where: { id: targetId, groupId },
    });
    if (!target) {
      throw new NotFoundException("Ce membre n'appartient pas à ton groupe");
    }

    target.role = role;
    await this.memberRepo.save(target);

    return {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      createdAt: target.createdAt,
    };
  }

  /**
   * Son propre profil — nom et email.
   *
   * Ne demande **aucun groupe** : on doit pouvoir corriger une faute de frappe
   * dans son email juste après l'inscription, avant même d'avoir rejoint qui
   * que ce soit.
   */
  async updateProfile(
    memberId: string,
    changes: { name?: string; email?: string; currentPassword?: string },
  ): Promise<MemberSummary> {
    // `password` est `select: false` sur l'entité — il faut le demander.
    const member = await this.memberRepo.findOne({
      where: { id: memberId },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        createdAt: true,
      },
    });
    if (!member) {
      throw new NotFoundException('Membre introuvable');
    }

    if (changes.email && changes.email !== member.email) {
      await this.assertPassword(member, changes.currentPassword);

      // L'email identifie le compte à la connexion : deux personnes ne peuvent
      // pas le partager. La contrainte d'unicité existe en base, mais lever un
      // 409 lisible vaut mieux que de laisser remonter une erreur Postgres.
      const taken = await this.memberRepo.findOne({
        where: { email: changes.email },
      });
      if (taken) {
        throw conflict(
          BUSINESS_CODES.EMAIL_TAKEN,
          'Un compte existe déjà avec cet email',
        );
      }
      member.email = changes.email;
    }

    if (changes.name !== undefined) member.name = changes.name;
    await this.memberRepo.save(member);

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      createdAt: member.createdAt,
    };
  }

  /**
   * Vérifie le mot de passe courant avant un changement d'email.
   *
   * Un **400** et non un 401 : le client termine la session sur tout 401, parce
   * qu'un token refusé ne vaut plus rien. Répondre 401 à un mot de passe mal
   * tapé déconnecterait donc quelqu'un dont la session est parfaitement valide.
   * Ce n'est pas le token qui est en cause ici, c'est le corps de la requête.
   */
  private async assertPassword(
    member: Member,
    candidate: string | undefined,
  ): Promise<void> {
    if (!candidate) {
      throw badRequest(
        BUSINESS_CODES.PASSWORD_REQUIRED_FOR_EMAIL_CHANGE,
        'Confirme ton mot de passe pour changer ton email',
      );
    }

    const matches = await bcrypt.compare(candidate, member.password);
    if (!matches) {
      throw badRequest(BUSINESS_CODES.WRONG_PASSWORD, 'Mot de passe incorrect');
    }
  }

  async updatePushToken(memberId: string, pushToken: string): Promise<void> {
    const result = await this.memberRepo.update(memberId, { pushToken });
    if (result.affected === 0) {
      throw new NotFoundException('Membre introuvable');
    }
  }
}
