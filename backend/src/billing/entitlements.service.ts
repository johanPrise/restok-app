import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Not, IsNull, Repository } from 'typeorm';
import { Group } from '../groups/entities/group.entity';

/**
 * Le groupe a-t-il payé ?
 *
 * ## Pourquoi le serveur, et pas le SDK
 *
 * RevenueCat raisonne par **utilisateur applicatif**. Le déblocage, lui, est
 * porté par le groupe : sinon une seule personne aurait le produit entier et les
 * cinq autres une version amputée, ce qui recréerait exactement l'asymétrie que
 * le journal ouvert à tous cherche à interdire.
 *
 * Le motif officiel pour ça — accorder des *promotional entitlements* aux autres
 * membres par l'API REST — est écarté délibérément. Il impose une révocation en
 * cascade à chaque départ, un délai entre les appels pour éviter le plafond de
 * débit, et il se désynchronise si un webhook se perd. Or **les quatre verrous
 * de cette app sont déjà côté serveur** : rien n'oblige RevenueCat à être la
 * source de vérité pour cinq membres sur six. Une colonne suffit.
 *
 * Les cinq autres membres n'interrogent donc jamais RevenueCat. Ils interrogent
 * cette API, qui lit une colonne.
 */
@Injectable()
export class EntitlementsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
  ) {}

  /**
   * `manager` permet de lire dans la transaction de l'appelant — indispensable
   * pour les plafonds, qui verrouillent le groupe avant de compter.
   */
  async isUnlocked(groupId: string, manager?: EntityManager): Promise<boolean> {
    const repo = manager ? manager.getRepository(Group) : this.groupRepo;

    return repo.exists({
      where: { id: groupId, unlockedByPurchaseId: Not(IsNull()) },
    });
  }
}
