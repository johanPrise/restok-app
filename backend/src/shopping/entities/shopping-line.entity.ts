import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { Item } from '../../items/entities/item.entity';
import { Member } from '../../members/entities/member.entity';

/**
 * Une ligne de la liste de courses.
 *
 * Deux natures dans une seule table :
 * - **liée** — `itemId` renseigné, la ligne prolonge un item de l'étagère. La
 *   cocher pourra le racheter ;
 * - **libre** — `label` renseigné, pour ce que le groupe ne suit pas. Du pain,
 *   du fromage : on les achète sans jamais vouloir les compter.
 *
 * Pas de soft-delete, contrairement au reste : une ligne de courses est un état
 * de passage, pas une entité métier à restaurer. Ce qui doit survivre, c'est le
 * rachat qu'elle produit — et lui part dans `action_history`.
 */
@Entity('shopping_line')
@Index('idx_shopping_group', ['groupId'])
/**
 * Un item ne peut figurer qu'une fois : c'est la « gestion des doublons » du
 * §12, traitée par la base plutôt que par du code qui compare des chaînes.
 * PostgreSQL considère deux `NULL` comme distincts, donc les lignes libres
 * échappent naturellement à la contrainte.
 */
@Unique('uq_shopping_item', ['groupId', 'itemId'])
export class ShoppingLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  /** `null` sur une ligne libre. */
  @Column({ name: 'item_id', type: 'uuid', nullable: true })
  itemId: string | null;

  // L'item supprimé emporte sa ligne, mais c'est `ItemDeletedListener` qui s'en
  // charge : la suppression d'un item est *douce*, donc ce `CASCADE` ne se
  // déclencherait jamais. Il reste comme filet pour une vraie suppression SQL.
  @ManyToOne(() => Item, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: Item | null;

  /**
   * Texte d'une ligne libre. `null` sur une ligne liée, dont le nom se lit sur
   * l'item — le recopier ici le figerait au moment de l'ajout, et un item
   * renommé mentirait sur la liste.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  label: string | null;

  /**
   * Unités à acheter — jamais des paquets. Le conditionnement vit côté
   * interface, comme partout ailleurs : « deux paquets » arrive ici en douze.
   *
   * `null` quand il n'y a rien à compter : suivi binaire, ou ligne libre sans
   * précision.
   */
  @Column({ type: 'int', nullable: true })
  quantity: number | null;

  @Column({ type: 'boolean', default: false })
  checked: boolean;

  @Column({ name: 'checked_by_id', type: 'uuid', nullable: true })
  checkedById: string | null;

  // Le membre qui part n'efface pas la coche : la ligne reste cochée, elle
  // devient seulement anonyme.
  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'checked_by_id' })
  checkedBy: Member | null;

  @Column({ name: 'checked_at', type: 'timestamptz', nullable: true })
  checkedAt: Date | null;

  @Column({ name: 'added_by_id', type: 'uuid', nullable: true })
  addedById: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'added_by_id' })
  addedBy: Member | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
