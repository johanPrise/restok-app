import { IsInt, IsOptional, Min } from 'class-validator';

export class RestockItemDto {
  /**
   * Quantité en stock après le rachat.
   *
   * Obligatoire pour un item suivi en `quantity` — sans elle, impossible de
   * savoir si l'item est reparti à 1 ou à 12. Inutile en mode `threshold`, qui
   * ne compte rien.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
