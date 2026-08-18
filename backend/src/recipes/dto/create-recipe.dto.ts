import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { AddIngredientDto } from './add-ingredient.dto';

export class CreateRecipeDto {
  @IsString()
  @Length(2, 100)
  name: string;

  /** URL ou simple mention. L'app ne va rien y chercher. */
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

  /**
   * Les ingrédients arrivent avec la recette, en un seul appel.
   *
   * Deux raisons : le formulaire se remplit d'un bloc et s'enregistre une fois,
   * et surtout une création en `1 + N` requêtes se déchirerait dans la file
   * hors-ligne — la recette partirait, ses ingrédients pas.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddIngredientDto)
  ingredients?: AddIngredientDto[];
}
