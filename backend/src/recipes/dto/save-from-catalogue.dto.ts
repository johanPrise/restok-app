import { IsString, Length } from 'class-validator';

export class SaveFromCatalogueDto {
  /**
   * L'identifiant de la page chez la source, tel que la recherche l'a rendu.
   *
   * On ne renvoie pas la recette entière depuis le client : ce serait lui
   * laisser réécrire les étapes et le nom au passage.
   */
  @IsString()
  @Length(1, 200)
  ref: string;
}
