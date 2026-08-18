import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';
import { Member } from '../../members/entities/member.entity';

export enum ActionType {
  TAKEN = 'taken',
  RESTOCKED = 'restocked',
}

// Log immuable. Pas de soft-delete ici : c'est un journal d'events, pas une
// entité métier à restaurer — il part en cascade avec l'item ou le membre.
@Entity('action_history')
@Index('idx_history_item', ['itemId'])
@Index('idx_history_member', ['memberId'])
export class ActionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @ManyToOne(() => Item, (item) => item.history, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @ManyToOne(() => Member, (member) => member.history, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: ActionType,
    enumName: 'action_type',
  })
  actionType: ActionType;

  /**
   * Combien a bougé — unités prises, unités rachetées.
   *
   * `null` en suivi binaire, qui ne compte rien : « j'ai pris le dernier » n'a
   * pas de quantité. Sans cette colonne, l'historique dit qui a agi mais jamais
   * à quelle hauteur, et la rotation pondérée par le coût prévue en V3 n'aurait
   * rien sur quoi s'appuyer.
   */
  @Column({ type: 'int', nullable: true })
  quantity: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
