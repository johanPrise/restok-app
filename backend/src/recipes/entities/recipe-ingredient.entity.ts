import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';
import { Recipe } from './recipe.entity';

/**
 * Un ingrédient d'une recette.
 *
 * Même forme qu'une ligne de courses, et ce n'est pas une coïncidence : les
 * deux répondent à la même question — « cette chose est-elle quelque part dans
 * le placard, ou faut-il l'acheter ? »
 *
 * - **lié** — `itemId` renseigné : l'ingrédient sait dire s'il est en stock, et
 *   c'est lui qui décide de la faisabilité du plat ;
 * - **libre** — `label` renseigné : le sel, le poivre, un filet de citron. Ce
 *   que personne ne suivra jamais, et qui ne doit donc jamais rendre une
 *   recette infaisable.
 *
 * **Aucune quantité en v1.** Une recette parle en grammes, l'app compte en
 * paquets entiers : traduire les deux demande de savoir combien de repas tient
 * dans un paquet, ce qui n'existe pas encore. La ligne dit seulement « ce plat
 * touche cet item », et c'est assez pour trier par faisabilité.
 */
@Entity('recipe_ingredient')
@Index('idx_ingredient_recipe', ['recipeId'])
@Index('idx_ingredient_item', ['itemId'])
/** Un item ne figure qu'une fois par recette — la base tranche, pas le code. */
@Unique('uq_ingredient_item', ['recipeId', 'itemId'])
export class RecipeIngredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_id', type: 'uuid' })
  recipeId: string;

  // Vraie cascade, contrairement aux items : une recette supprimée emporte ses
  // ingrédients, qui n'ont aucun sens sans elle.
  @ManyToOne(() => Recipe, (recipe) => recipe.ingredients, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  /** `null` sur un ingrédient libre. */
  @Column({ name: 'item_id', type: 'uuid', nullable: true })
  itemId: string | null;

  /**
   * `SET NULL` plutôt que `CASCADE`, et c'est la différence de fond avec la
   * liste de courses : une ligne de courses supprimée avec son item ne coûte
   * rien, elle était transitoire. Une recette, elle, est un document — la vider
   * de ses ingrédients laisserait un risotto sans riz, sans que personne ne
   * sache pourquoi.
   *
   * `RecipeItemDeletedListener` fait la conversion propre : il recopie le nom
   * dans `label` avant que le lien tombe. L'ingrédient reste lisible, il cesse
   * seulement de compter pour la faisabilité.
   */
  @ManyToOne(() => Item, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'item_id' })
  item: Item | null;

  /**
   * Rang dans la recette — l'ordre dans lequel on lit une liste d'ingrédients.
   *
   * Explicite, parce que `created_at` ne peut pas l'ordonner : les ingrédients
   * d'une même recette naissent dans une seule transaction, et `now()` y est
   * constant. Ils partageaient donc tous la même date, et l'ordre devenait
   * celui que la base voulait bien rendre — il changeait même après une simple
   * mise à jour de ligne.
   */
  @Column({ type: 'int', default: 0 })
  position: number;

  /**
   * Texte d'un ingrédient libre. `null` sur un lié, dont le nom se lit sur
   * l'item : le recopier le figerait, et un item renommé mentirait sur la
   * recette.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  label: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
