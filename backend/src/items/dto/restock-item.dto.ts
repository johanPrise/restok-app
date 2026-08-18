import { IsInt, IsOptional, Min } from 'class-validator';

export class RestockItemDto {
  /**
   * Nombre d'unités rapportées — **ce qu'on a acheté**, pas le stock final.
   *
   * On sait dire « j'ai racheté six rouleaux » en sortant du magasin ; savoir
   * qu'il faut saisir huit parce qu'il en restait deux, c'est faire l'addition
   * à la place de l'app.
   *
   * Obligatoire en suivi `quantity` : sans elle, impossible de savoir si
   * l'item repart avec une unité ou avec douze. Inutile en suivi binaire.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
