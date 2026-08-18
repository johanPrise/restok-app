import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class AddIngredientDto {
  /**
   * Rattache l'ingrédient à un item de l'étagère. Exclusif avec `label` : c'est
   * lui qui rend l'ingrédient comptable pour la faisabilité du plat.
   */
  @IsOptional()
  @IsUUID()
  itemId?: string;

  /** Ce que le groupe ne suivra jamais : le sel, le poivre, un filet de citron. */
  @IsOptional()
  @IsString()
  @Length(2, 100)
  label?: string;
}
