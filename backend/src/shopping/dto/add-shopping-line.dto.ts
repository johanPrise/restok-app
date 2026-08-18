import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class AddShoppingLineDto {
  /**
   * Rattache la ligne à un item de l'étagère. Exclusif avec `label` : une ligne
   * est soit le prolongement d'un item, soit du texte libre — jamais les deux.
   */
  @IsOptional()
  @IsUUID()
  itemId?: string;

  /** Ce que le groupe ne suit pas : du pain, du fromage. */
  @IsOptional()
  @IsString()
  @Length(2, 100)
  label?: string;

  /**
   * Unités à acheter, jamais des paquets — le conditionnement se convertit côté
   * interface. Facultatif : « du pain » se passe de quantité.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
