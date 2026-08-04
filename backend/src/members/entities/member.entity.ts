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
} from 'typeorm';
import { ActionHistory } from '../../action-history/entities/action-history.entity';
import { Group } from '../../groups/entities/group.entity';

export enum MemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('member')
@Index('idx_member_group', ['groupId'])
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  // Hash bcrypt. Jamais sérialisé vers le client : voir MemberResponseDto.
  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: MemberRole,
    enumName: 'member_role',
    default: MemberRole.MEMBER,
  })
  role: MemberRole;

  @Column({ name: 'push_token', type: 'varchar', length: 255, nullable: true })
  pushToken: string | null;

  // Nullable : un membre existe avant de rejoindre un groupe (juste après l'inscription).
  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null;

  @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group | null;

  @OneToMany(() => ActionHistory, (history) => history.member)
  history: ActionHistory[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
