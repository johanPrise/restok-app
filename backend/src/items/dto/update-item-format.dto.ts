import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateItemFormatDto {
  /**
   * Ce qui est écrit sur l'étiquette. Une chaîne vide efface le format —
   * corriger une erreur ne doit pas demander de supprimer l'item.
   */
  @IsOptional()
  @IsString()
  @Length(0, 20)
  format?: string;
}
