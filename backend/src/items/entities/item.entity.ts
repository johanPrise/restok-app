import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ActionHistory } from '../../action-history/entities/action-history.entity';
import { Group } from '../../groups/entities/group.entity';

export enum ItemStatus {
  AVAILABLE = 'available',
  LOW = 'low',
  OUT_OF_STOCK = 'out_of_stock',
  TO_RESTOCK = 'to_restock',
}

export enum TrackingType {
  THRESHOLD = 'threshold',
  QUANTITY = 'quantity',
}

@Entity('item')
@Index('idx_item_group', ['groupId'])
// La requête la plus fréquente de l'app : tous les items d'un groupe, triés par statut.
@Index('idx_item_status', ['groupId', 'status'])
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: ItemStatus,
    enumName: 'item_status',
    default: ItemStatus.AVAILABLE,
  })
  status: ItemStatus;

  @Column({
    name: 'tracking_type',
    type: 'enum',
    enum: TrackingType,
    enumName: 'tracking_type',
    default: TrackingType.THRESHOLD,
  })
  trackingType: TrackingType;

  // quantity et lowThreshold ne servent qu'en mode `quantity`.
  @Column({ type: 'int', nullable: true })
  quantity: number | null;

  @Column({ name: 'low_threshold', type: 'int', nullable: true, default: 1 })
  lowThreshold: number | null;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, (group) => group.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @OneToMany(() => ActionHistory, (history) => history.item)
  history: ActionHistory[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
