import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ActionHistory, ActionType } from './entities/action-history.entity';

export interface ActionHistoryEntry {
  id: string;
  actionType: ActionType;
  /** Unités déplacées. `null` en suivi binaire, qui ne compte rien. */
  quantity: number | null;
  createdAt: Date;
  member: { id: string; name: string } | null;
}

/** Dernière action sur un item, telle qu'affichée sous son nom sur l'étagère. */
export interface LastAction {
  actionType: ActionType;
  at: Date;
  /** `null` quand le compte de l'auteur a été supprimé. */
  memberName: string | null;
}

/** Une ligne du journal du groupe, telle que le client la reçoit. */
export interface GroupHistoryEntry {
  id: string;
  actionType: ActionType;
  quantity: number | null;
  createdAt: Date;
  itemId: string;
  itemName: string;
  memberName: string | null;
}

interface GroupHistoryRow {
  id: string;
  action_type: ActionType;
  quantity: number | null;
  created_at: Date;
  item_id: string;
  item_name: string;
  member_name: string | null;
}

interface LastActionRow {
  item_id: string;
  action_type: ActionType;
  created_at: Date;
  member_name: string | null;
}

@Injectable()
export class ActionHistoryService {
  constructor(
    @InjectRepository(ActionHistory)
    private readonly historyRepo: Repository<ActionHistory>,
  ) {}

  /**
   * `manager` permet d'écrire dans la transaction de l'appelant : l'entrée
   * d'historique et le changement de statut doivent être atomiques.
   */
  async record(
    itemId: string,
    memberId: string,
    actionType: ActionType,
    quantity: number | null = null,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(ActionHistory)
      : this.historyRepo;

    await repo.save(repo.create({ itemId, memberId, actionType, quantity }));
  }

  /**
   * Dernière action de chaque item, en **une seule requête**.
   *
   * L'étagère affiche « Sam · il y a 2 jours » sous chaque nom ; interroger
   * l'historique tag par tag ferait autant de requêtes que d'items. Le
   * `DISTINCT ON` de PostgreSQL retient la ligne la plus récente par item,
   * ce qu'aucune option de `find()` n'exprime.
   *
   * Le `LEFT JOIN` conserve l'action quand l'auteur a supprimé son compte :
   * l'événement a eu lieu, seul le nom disparaît.
   */
  async findLastActionByItem(
    itemIds: string[],
  ): Promise<Map<string, LastAction>> {
    if (itemIds.length === 0) return new Map();

    const rows = await this.historyRepo.query<LastActionRow[]>(
      `SELECT DISTINCT ON (h.item_id)
         h.item_id, h.action_type, h.created_at, m.name AS member_name
       FROM action_history h
       LEFT JOIN member m ON m.id = h.member_id AND m.deleted_at IS NULL
       WHERE h.item_id = ANY($1)
       ORDER BY h.item_id, h.created_at DESC`,
      [itemIds],
    );

    return new Map(
      rows.map((row) => [
        row.item_id,
        {
          actionType: row.action_type,
          at: row.created_at,
          memberName: row.member_name,
        },
      ]),
    );
  }

  /**
   * Le journal du groupe entier.
   *
   * La donnée était complète depuis le début — item, membre, action, quantité,
   * date — mais la seule porte était `findByItem`. Pour répondre à « qu'a sorti
   * Marc ce mois-ci », il fallait ouvrir chaque fiche et recoudre à la main.
   *
   * L'item est joint parce qu'un journal sans le nom de la chose ne dit rien,
   * et il l'est **même supprimé** : ce qui a eu lieu a eu lieu, et une
   * association doit pouvoir relire l'année passée sans que le ménage de
   * l'étagère efface ses traces.
   */
  async findByGroup(
    groupId: string,
    filters: { memberId?: string; since?: Date; limit: number },
  ): Promise<GroupHistoryEntry[]> {
    const query = this.historyRepo
      .createQueryBuilder('h')
      // `withDeleted` : TypeORM résout « item » comme **entité**, et lui
      // applique donc sa condition de soft-delete jusque dans la jointure. Le
      // journal perdait alors toute trace d'un item retiré de l'étagère — soit
      // exactement ce qu'une association ne peut pas se permettre.
      .withDeleted()
      .innerJoin('item', 'i', 'i.id = h.item_id')
      .leftJoin('member', 'm', 'm.id = h.member_id AND m.deleted_at IS NULL')
      .select([
        'h.id AS id',
        'h.action_type AS action_type',
        'h.quantity AS quantity',
        'h.created_at AS created_at',
        'i.name AS item_name',
        'i.id AS item_id',
        'm.name AS member_name',
      ])
      .where('i.group_id = :groupId', { groupId })
      .orderBy('h.created_at', 'DESC')
      .limit(filters.limit);

    if (filters.memberId) {
      query.andWhere('h.member_id = :memberId', { memberId: filters.memberId });
    }
    if (filters.since) {
      query.andWhere('h.created_at >= :since', { since: filters.since });
    }

    const rows = await query.getRawMany<GroupHistoryRow>();

    return rows.map((row) => ({
      id: row.id,
      actionType: row.action_type,
      quantity: row.quantity,
      createdAt: row.created_at,
      itemId: row.item_id,
      itemName: row.item_name,
      // `null` quand le compte a été supprimé : l'acte survit à son auteur.
      memberName: row.member_name,
    }));
  }

  async findByItem(itemId: string): Promise<ActionHistoryEntry[]> {
    const entries = await this.historyRepo.find({
      where: { itemId },
      relations: { member: true },
      order: { createdAt: 'DESC' },
    });

    return entries.map((entry) => ({
      id: entry.id,
      actionType: entry.actionType,
      quantity: entry.quantity,
      createdAt: entry.createdAt,
      // Un membre soft-deleted ne remonte plus : l'action reste, l'auteur
      // devient anonyme plutôt que de faire disparaître la ligne.
      member: entry.member
        ? { id: entry.member.id, name: entry.member.name }
        : null,
    }));
  }
}
