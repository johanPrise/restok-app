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

  /**
   * Quand le mot de passe a changé pour la dernière fois.
   *
   * Les JWT ne se révoquent pas un par un — le nôtre ne porte que `sub`, et
   * rien ne tient la liste de ceux émis. Cette date suffit pourtant : un token
   * émis avant elle est refusé. Sans quoi une réinitialisation ne reprendrait
   * pas le compte à qui s'y était introduit, qui garderait sa session jusqu'à
   * expiration — c'est-à-dire précisément le contraire de ce qu'on vient de
   * faire.
   *
   * `null` pour les comptes créés avant cette colonne : rien à invalider.
   */
  @Column({
    name: 'password_changed_at',
    type: 'timestamptz',
    nullable: true,
  })
  passwordChangedAt: Date | null;

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
