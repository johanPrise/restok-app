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
 * Une preuve de paiement. Immuable.
 *
 * Séparée du déblocage lui-même — porté par `group.unlocked_by_purchase_id` —
 * et cette séparation fait tout le travail :
 *
 * - **Le groupe garde son déblocage quand l'acheteur s'en va.** C'est le groupe
 *   qui a payé, pas la personne, et l'app promeut de toute façon un successeur
 *   automatiquement. Lier le déblocage au membre l'aurait fait disparaître avec
 *   lui.
 * - **L'acheteur garde sa preuve.** S'il rejoint plus tard un autre groupe non
 *   débloqué, il peut y appliquer son achat. Lui refuser reviendrait à punir
 *   celui qui a payé.
 *
 * `store_transaction_id` est unique : c'est la clé d'idempotence. Un webhook
 * rejoué — ils le sont — ne doit pas créer deux achats.
 */
@Entity('purchase')
@Index('idx_purchase_member', ['memberId'])
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Qui a payé. Reste renseigné après la suppression du compte : la ligne du
   * membre survit en soft-delete, vidée de ce qui l'identifie.
   */
  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  /** L'identifiant du produit chez le magasin — à vie ou annuel. */
  @Column({ name: 'product_id', type: 'varchar', length: 100 })
  productId: string;

  /** `app_store`, `play_store`, `rc_billing`, `test_store`… */
  @Column({ type: 'varchar', length: 40 })
  store: string;

  @Column({
    name: 'store_transaction_id',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  storeTransactionId: string;

  @Column({ name: 'purchased_at', type: 'timestamptz' })
  purchasedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
