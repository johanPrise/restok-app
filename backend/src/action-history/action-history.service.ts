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
