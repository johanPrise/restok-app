import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { RefreshTokenService } from '../auth/refresh-token.service';
import { GroupsService } from '../groups/groups.service';
import { Member, MemberRole } from './entities/member.entity';
import { pickSuccessor } from './succession';
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
    private readonly groupsService: GroupsService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly dataSource: DataSource,
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
   * Personne n'est retenu, y compris le dernier admin. Cette méthode lui
   * opposait un refus — « nomme quelqu'un d'abord » — qui tenait tant qu'on
   * pouvait choisir de rester ; la suppression de compte a rendu ce refus
   * intenable, et le garder ici aurait fait dépendre le droit de partir du
   * bouton sur lequel on appuie. La place est donc reprise d'office :
   * voir `departFrom`.
   */
  async leaveGroup(memberId: string, groupId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const member = await manager
        .getRepository(Member)
        .findOne({ where: { id: memberId, groupId } });
      if (!member) {
        throw new NotFoundException("Tu n'appartiens pas à ce groupe");
      }

      await this.departFrom(manager, member);
    });
  }

  /**
   * Supprimer son compte — pour de bon, et sans rien demander à personne.
   *
   * Aucune condition, aucun refus : c'est une exigence des deux stores, et
   * c'est surtout la seule réponse acceptable à quelqu'un qui veut s'en aller.
   * Ce qui bloquait le départ du dernier admin est donc traité, pas opposé —
   * voir `departFrom`.
   *
   * Le compte part en **soft-delete**, et c'est ce qui rend le journal
   * anonyme sans le trouer : ses lignes restent, `JwtStrategy` et les lectures
   * du registre ignorent déjà les membres supprimés, et « Sam · il y a 2
   * jours » devient une action sans auteur. Effacer les lignes aurait crevé le
   * registre des autres, qui s'en servent pour savoir qui a pris quoi ; les
   * garder nommées aurait conservé une donnée personnelle après suppression.
   *
   * Les sessions longues partent avec : sans ça, un refresh token survivrait
   * deux mois à un compte qui n'existe plus.
   */
  async deleteAccount(memberId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Member);
      const member = await repo.findOne({ where: { id: memberId } });
      if (!member) {
        throw new NotFoundException('Membre introuvable');
      }

      if (member.groupId) {
        await this.departFrom(manager, member);
      }

      // L'email est unique en base : le laisser tel quel interdirait de se
      // réinscrire avec la même adresse, ce qui ferait d'une suppression un
      // bannissement. Il est donc brouillé, en gardant la ligne lisible pour
      // qui débogue.
      await repo.update(member.id, {
        email: `supprime+${member.id}@restock.invalid`,
        pushToken: null,
      });
      await repo.softDelete(member.id);
    });

    // Hors transaction : la session est déjà morte pour `JwtStrategy`, qui ne
    // trouve plus le membre. Ceci ferme la porte du renouvellement.
    await this.refreshTokens.revokeAllFor(memberId);
  }

  /**
   * Le départ d'un membre de son groupe, quelle qu'en soit la raison.
   *
   * Trois cas, dans cet ordre :
   *
   * - **Seul dans le groupe** — le groupe s'en va avec lui. Le laisser derrière
   *   fabriquait un groupe vide que plus personne ne pouvait ni rouvrir ni
   *   supprimer, avec son nom et ses items conservés indéfiniment.
   * - **Dernier admin, mais pas seul** — la place est reprise d'office par le
   *   membre présent depuis le plus longtemps. C'est ce que font WhatsApp et
   *   Telegram, et c'est ce qui remplace le refus qu'opposait cette méthode.
   * - **Sinon** — il n'y a rien à transmettre.
   */
  private async departFrom(
    manager: EntityManager,
    member: Member,
  ): Promise<void> {
    const repo = manager.getRepository(Member);
    const groupId = member.groupId!;

    const others = await repo.find({
      where: { groupId },
      select: { id: true, role: true, joinedAt: true, createdAt: true },
    });
    const remaining = others.filter((other) => other.id !== member.id);

    if (remaining.length === 0) {
      // `removeWithin` détache déjà tous les membres du groupe, celui-ci
      // compris : il n'y a rien à faire de plus.
      await this.groupsService.removeWithin(manager, groupId);
      return;
    }

    const lastAdmin =
      member.role === MemberRole.ADMIN &&
      !remaining.some((other) => other.role === MemberRole.ADMIN);

    if (lastAdmin) {
      const successor = pickSuccessor(remaining);
      // `remaining` n'est pas vide, donc il y a forcément un successeur.
      await repo.update(successor!.id, { role: MemberRole.ADMIN });
    }

    await repo.update(member.id, {
      groupId: null,
      role: MemberRole.MEMBER,
      joinedAt: null,
    });
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
