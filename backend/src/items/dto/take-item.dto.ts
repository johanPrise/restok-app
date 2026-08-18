import { IsInt, IsOptional, Min } from 'class-validator';

export class TakeItemDto {
  /**
   * Nombre d'unités prises. Une seule par défaut — le geste rapide de
   * l'étagère n'a rien à préciser.
   *
   * Ignoré en suivi binaire, qui ne compte rien. Demander plus que le stock
   * disponible ne fait pas d'erreur : l'item se vide, et l'historique
   * enregistre ce qui a réellement bougé.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
