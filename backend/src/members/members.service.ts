import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member, MemberRole } from './entities/member.entity';

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
      throw new BadRequestException(
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
        throw new ConflictException(
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
      throw new BadRequestException('Un admin ne change pas son propre rôle');
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

  async updatePushToken(memberId: string, pushToken: string): Promise<void> {
    const result = await this.memberRepo.update(memberId, { pushToken });
    if (result.affected === 0) {
      throw new NotFoundException('Membre introuvable');
    }
  }
}
