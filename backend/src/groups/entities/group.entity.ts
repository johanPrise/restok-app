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
  /**
   * Une seule personne. C'est un groupe comme les autres — même étagère, mêmes
   * courses, mêmes recettes — et c'est tout l'intérêt : rien du code existant
   * n'a besoin d'un second chemin.
   *
   * Le type ne sert donc pas à ajouter, il sert à **retirer** : à une personne,
   * le code d'invitation, la liste des membres, les rôles et « qui a pris »
   * n'ont rien à dire.
   */
  SOLO = 'solo',
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
