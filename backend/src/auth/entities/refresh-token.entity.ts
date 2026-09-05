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
 * Une session longue, matérialisée.
 *
 * L'access token dure une heure et ne se révoque pas ; celui-ci dure deux mois
 * et se révoque, parce qu'il est une ligne en base qu'on peut effacer. C'est
 * toute la répartition : le JWT prouve vite et sans requête, la ligne ci-dessous
 * décide qui a encore le droit d'en obtenir un neuf.
 *
 * ## Pourquoi un SHA-256, alors que le code de réinitialisation est en bcrypt
 *
 * Deux raisons, et la seconde suffirait.
 *
 * Un code de réinitialisation fait huit caractères : sous un simple SHA, une
 * base qui fuite se casse hors ligne en quelques secondes, d'où bcrypt et son
 * coût délibéré. Ce token-ci fait 256 bits tirés au sort — il n'y a rien à
 * deviner, et ralentir la comparaison ne protège de rien.
 *
 * Surtout, bcrypt ne s'interroge pas : on ne retrouve pas une ligne par un hash
 * bcrypt, il faut déjà savoir laquelle comparer. La réinitialisation s'en
 * accommode en repassant l'email d'un écran à l'autre ; ici le client n'envoie
 * que le token, et rien d'autre ne dit de qui il parle. Le hash doit donc être
 * déterministe et indexable.
 */
@Entity('refresh_token')
@Index('idx_refresh_token_member', ['memberId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  /** SHA-256 en hexadécimal du token remis au client, qui n'est jamais stocké. */
  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /**
   * Quand ce token a cessé de valoir — consommé par une rotation, ou coupé.
   *
   * La ligne **reste** après sa révocation, au lieu d'être effacée : c'est ce
   * qui permet de distinguer un token qu'on a déjà utilisé d'un token qu'on n'a
   * jamais émis. Le premier a fuité, le second n'est qu'un essai au hasard, et
   * les deux ne méritent pas la même réponse. Le ménage se fait à l'expiration
   * naturelle, pas à la révocation.
   */
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  /**
   * Le token émis en échange de celui-ci lors de la rotation.
   *
   * Sert à la fenêtre de grâce : quand une réponse se perd en chemin et que le
   * client rejoue le token qu'il croit encore courant, il faut pouvoir couper
   * le remplaçant que lui n'a jamais reçu. Sans ce lien, deux tokens vivants
   * resteraient en circulation pour une seule session.
   */
  @Column({ name: 'replaced_by_id', type: 'uuid', nullable: true })
  replacedById: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
