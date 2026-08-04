import {
  BadRequestException,
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

  async updatePushToken(memberId: string, pushToken: string): Promise<void> {
    const result = await this.memberRepo.update(memberId, { pushToken });
    if (result.affected === 0) {
      throw new NotFoundException('Membre introuvable');
    }
  }
}
