import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';

/**
 * Une demande de réinitialisation en cours.
 *
 * Le code n'est **pas** stocké : seul son hash bcrypt l'est. Une base qui
 * fuite ne doit pas livrer des prises de contrôle — et un code de huit
 * caractères se casse hors ligne en quelques secondes s'il n'est protégé que
 * par un SHA.
 *
 * C'est ce choix qui impose de redemander l'email à la validation : on ne peut
 * pas retrouver une ligne par un hash bcrypt, il faut savoir de qui on parle
 * avant de comparer. L'app le porte d'un écran à l'autre, personne ne le
 * retape.
 *
 * La ligne part avec le membre (`CASCADE`) : une demande sans compte derrière
 * ne veut plus rien dire.
 */
@Entity('password_reset')
@Index('idx_password_reset_member', ['memberId'])
export class PasswordReset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ name: 'code_hash', type: 'varchar', length: 255 })
  codeHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /**
   * Essais déjà faits sur ce code.
   *
   * Le plafond de débit compte par adresse IP ; celui-ci compte par demande, ce
   * qui ferme la porte à quelqu'un qui répartirait ses essais. Huit caractères
   * dans un alphabet de trente-deux tiennent largement — à condition qu'on ne
   * puisse pas les essayer tous.
   */
  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
