import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ActionHistory, ActionType } from './entities/action-history.entity';

export interface ActionHistoryEntry {
  id: string;
  actionType: ActionType;
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
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(ActionHistory)
      : this.historyRepo;

    await repo.save(repo.create({ itemId, memberId, actionType }));
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

  async findByItem(itemId: string): Promise<ActionHistoryEntry[]> {
    const entries = await this.historyRepo.find({
      where: { itemId },
      relations: { member: true },
      order: { createdAt: 'DESC' },
    });

    return entries.map((entry) => ({
      id: entry.id,
      actionType: entry.actionType,
      createdAt: entry.createdAt,
      // Un membre soft-deleted ne remonte plus : l'action reste, l'auteur
      // devient anonyme plutôt que de faire disparaître la ligne.
      member: entry.member
        ? { id: entry.member.id, name: entry.member.name }
        : null,
    }));
  }
}
