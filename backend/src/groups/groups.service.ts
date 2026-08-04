import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Item } from '../items/entities/item.entity';
import { Member, MemberRole } from '../members/entities/member.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group, GroupType } from './entities/group.entity';
import { generateInviteCode, normalizeInviteCode } from './invite-code';

const MAX_INVITE_CODE_ATTEMPTS = 5;

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    private readonly dataSource: DataSource,
  ) {}

  // Pas de token à réémettre : les droits sont relus en base à chaque requête
  // (voir JwtStrategy), le token du client reste valide tel quel.
  async create(dto: CreateGroupDto, creatorId: string): Promise<Group> {
    return this.dataSource.transaction(async (manager) => {
      const member = await this.requireFreeMember(manager, creatorId);

      const groupRepo = manager.getRepository(Group);
      const group = await groupRepo.save(
        groupRepo.create({
          name: dto.name,
          type: dto.type ?? GroupType.ROOMMATES,
          inviteCode: await this.pickUnusedInviteCode(groupRepo),
        }),
      );

      // Le créateur devient admin du groupe qu'il vient d'ouvrir.
      member.groupId = group.id;
      member.role = MemberRole.ADMIN;
      await manager.getRepository(Member).save(member);

      return group;
    });
  }

  async join(dto: JoinGroupDto, memberId: string): Promise<Group> {
    return this.dataSource.transaction(async (manager) => {
      const member = await this.requireFreeMember(manager, memberId);

      const group = await manager.getRepository(Group).findOne({
        where: { inviteCode: normalizeInviteCode(dto.inviteCode) },
      });
      if (!group) {
        throw new NotFoundException('Ce code ne correspond à aucun groupe');
      }

      member.groupId = group.id;
      member.role = MemberRole.MEMBER;
      await manager.getRepository(Member).save(member);

      return group;
    });
  }

  async findMine(groupId: string): Promise<Group & { memberCount: number }> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Groupe introuvable');
    }

    const memberCount = await this.memberRepo.countBy({ groupId });
    return { ...group, memberCount };
  }

  async rename(groupId: string, dto: UpdateGroupDto): Promise<Group> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Groupe introuvable');
    }

    group.name = dto.name;
    return this.groupRepo.save(group);
  }

  /**
   * Soft-delete du groupe et de ses items, puis détachement des membres.
   *
   * Le soft-delete ne cascade pas : sans détachement les membres resteraient
   * rattachés à un groupe invisible, incapables d'en créer ou d'en rejoindre
   * un autre.
   */
  async remove(groupId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const group = await manager
        .getRepository(Group)
        .findOne({ where: { id: groupId } });
      if (!group) {
        throw new NotFoundException('Groupe introuvable');
      }

      await manager.getRepository(Item).softDelete({ groupId });
      await manager
        .getRepository(Member)
        .update({ groupId }, { groupId: null, role: MemberRole.MEMBER });
      await manager.getRepository(Group).softRemove(group);
    });
  }

  /** Charge le membre et refuse s'il appartient déjà à un groupe (MVP : un seul). */
  private async requireFreeMember(
    manager: EntityManager,
    memberId: string,
  ): Promise<Member> {
    const member = await manager
      .getRepository(Member)
      .findOne({ where: { id: memberId } });

    if (!member) {
      throw new NotFoundException('Membre introuvable');
    }
    if (member.groupId) {
      throw new ConflictException(
        "Tu appartiens déjà à un groupe — quitte-le avant d'en rejoindre un autre",
      );
    }

    return member;
  }

  /**
   * `withDeleted` est indispensable : un groupe soft-deleted conserve sa ligne,
   * donc son code reste réservé par la contrainte UNIQUE.
   */
  private async pickUnusedInviteCode(
    groupRepo: Repository<Group>,
  ): Promise<string> {
    for (let attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt++) {
      const inviteCode = generateInviteCode();
      const taken = await groupRepo.exists({
        where: { inviteCode },
        withDeleted: true,
      });

      if (!taken) return inviteCode;
    }

    throw new ServiceUnavailableException(
      "Impossible de générer un code d'invitation, réessaie",
    );
  }
}
