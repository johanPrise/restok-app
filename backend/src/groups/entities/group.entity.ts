import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';
import { Member } from '../../members/entities/member.entity';

export enum GroupType {
  ROOMMATES = 'roommates',
  ASSOCIATION = 'association',
}

@Entity('group')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: GroupType,
    enumName: 'group_type',
    default: GroupType.ROOMMATES,
  })
  type: GroupType;

  @Index({ unique: true })
  @Column({ name: 'invite_code', type: 'varchar', length: 8, unique: true })
  inviteCode: string;

  @OneToMany(() => Member, (member) => member.group)
  members: Member[];

  @OneToMany(() => Item, (item) => item.group)
  items: Item[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
