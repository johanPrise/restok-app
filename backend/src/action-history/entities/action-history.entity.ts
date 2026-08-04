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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
