import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

/**
 * Écrit à la main plutôt que dérivé de `CreateRecipeDto` : c'est la convention
 * des autres DTO du projet, et surtout les ingrédients doivent en rester
 * dehors. Ils ont leurs propres routes — en ajouter un ne doit pas obliger à
 * renvoyer toute la liste, et un envoi partiel effacerait les autres sans le
 * dire.
 */
export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  source?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;
}
