import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EntitlementsService } from '../billing/entitlements.service';
import { FREE_MEMBERS } from '../billing/limits';
import { Item } from '../items/entities/item.entity';
import { Member, MemberRole } from '../members/entities/member.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group, GroupType } from './entities/group.entity';
import { generateInviteCode, normalizeInviteCode } from './invite-code';
import { BUSINESS_CODES, conflict } from '../common/business-error';

const MAX_INVITE_CODE_ATTEMPTS = 5;

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    private readonly dataSource: DataSource,
    private readonly entitlements: EntitlementsService,
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
      // Daté à l'entrée, pas à l'inscription : c'est cette date qui désignera
      // son successeur le jour où il partira. Voir `succession.ts`.
      member.joinedAt = new Date();
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

      // Le plafond se compte ici et pas à l'invitation : un code d'invitation
      // circule, il n'est pas nominatif, et refuser au moment où quelqu'un le
      // saisit est le seul instant où l'on sait combien ils sont vraiment.
      if (!(await this.entitlements.isUnlocked(group.id, manager))) {
        const present = await manager
          .getRepository(Member)
          .count({ where: { groupId: group.id } });

        if (present >= FREE_MEMBERS) {
          throw conflict(
            BUSINESS_CODES.FREE_MEMBER_LIMIT_REACHED,
            `Ce groupe est complet : la version gratuite s'arrête à ${FREE_MEMBERS} personnes.`,
            { max: FREE_MEMBERS },
          );
        }
      }

      member.groupId = group.id;
      member.role = MemberRole.MEMBER;
      member.joinedAt = new Date();
      await manager.getRepository(Member).save(member);

      // Un groupe « solo » qui accueille quelqu'un cesse d'en être un. Sans
      // ça, le type mentirait : l'app continuerait de cacher la liste des
      // membres et la mention de qui a pris quoi, alors qu'ils sont deux.
      if (group.type === GroupType.SOLO) {
        group.type = GroupType.ROOMMATES;
        await manager.getRepository(Group).save(group);
      }

      return group;
    });
  }

  /**
   * Le groupe, tel que l'app le lit à chaque ouverture.
   *
   * `isUnlocked` y voyage plutôt que dans une route à part : c'est déjà le
   * payload que le mobile garde en cache persisté, donc le drapeau hérite
   * gratuitement de sa fraîcheur et de sa durée de vie. Une route dédiée aurait
   * eu son propre cache, et les deux auraient fini par se contredire.
   *
   * L'identifiant de l'achat, lui, ne sort pas : le client n'a rien à faire
   * d'une clé étrangère, et il ne doit pas pouvoir déduire *qui* a payé.
   */
  async findMine(groupId: string): Promise<
    Omit<Group, 'unlockedByPurchaseId'> & {
      memberCount: number;
      isUnlocked: boolean;
    }
  > {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Groupe introuvable');
    }

    const memberCount = await this.memberRepo.countBy({ groupId });
    const { unlockedByPurchaseId, ...rest } = group;

    return { ...rest, memberCount, isUnlocked: unlockedByPurchaseId !== null };
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
    await this.dataSource.transaction((manager) =>
      this.removeWithin(manager, groupId),
    );
  }

  /**
   * Le même travail, dans la transaction de l'appelant.
   *
   * `MembersService` en a besoin : quand le dernier membre s'en va — ou
   * supprime son compte — le groupe qu'il laisse derrière lui n'a plus
   * personne pour le rouvrir, et son départ doit l'emporter dans le même
   * mouvement. Deux transactions imbriquées auraient laissé la fenêtre d'un
   * groupe vidé de ses membres mais toujours vivant.
   */
  async removeWithin(manager: EntityManager, groupId: string): Promise<void> {
    const group = await manager
      .getRepository(Group)
      .findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Groupe introuvable');
    }

    await manager.getRepository(Item).softDelete({ groupId });
    await manager
      .getRepository(Member)
      .update(
        { groupId },
        { groupId: null, role: MemberRole.MEMBER, joinedAt: null },
      );
    await manager.getRepository(Group).softRemove(group);
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
      throw conflict(
        BUSINESS_CODES.ALREADY_IN_A_GROUP,
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
