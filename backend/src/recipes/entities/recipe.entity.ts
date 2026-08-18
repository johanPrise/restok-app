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
import { Group } from '../../groups/entities/group.entity';
import { Member } from '../../members/entities/member.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';

/**
 * Un plat que le groupe cuisine.
 *
 * L'app n'héberge pas d'instructions de cuisine : `source` renvoie vers
 * Marmiton, un blog ou un livre, et `description` est un mémo humain — « 200 g
 * de riz, 2 c. à soupe d'huile ». **Rien de tout ça n'est analysé.** Ce que
 * l'app sait faire, c'est dire quels plats sont faisables avec ce qu'il y a
 * dans le placard ; les grammes ne l'y aident pas.
 *
 * Soft-delete comme les autres entités durables : une recette est un document
 * que le groupe garde, et la v2 y accrochera les lots du journal.
 */
@Entity('recipe')
@Index('idx_recipe_group', ['groupId'])
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** URL ou simple mention — « le livre rouge, page 42 ». */
  @Column({ type: 'varchar', length: 500, nullable: true })
  source: string | null;

  /** Le mémo de celui qui cuisine, pour celui qui cuisinera. */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Pour combien de personnes. Purement descriptif en v1 : rien n'est
   * multiplié, puisque rien n'est déduit.
   */
  @Column({ type: 'int', nullable: true })
  servings: number | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  // Le membre qui part laisse ses recettes au groupe : elles ne lui
  // appartiennent pas, elles appartiennent au placard commun.
  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Member | null;

  @OneToMany(() => RecipeIngredient, (ingredient) => ingredient.recipe)
  ingredients: RecipeIngredient[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
