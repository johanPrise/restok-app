import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/** Une page. Le reste s'obtient en descendant, plus en filtrant. */
export const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class QueryHistoryDto {
  /** Ce qu'une association demande en premier : « qu'a sorti untel ? ». */
  @IsOptional()
  @IsUUID()
  memberId?: string;

  /** Borne basse, en ISO. « Ce mois-ci » se calcule côté client. */
  @IsOptional()
  @IsISO8601()
  since?: string;

  /**
   * La taille d'une page, plafonnée : un journal est fait pour être relu, pas
   * téléchargé d'un bloc. L'export, quand il viendra, sera une route à part.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;

  /**
   * Où reprendre. Rendu par la page précédente, opaque pour le client.
   *
   * Il remplace le plafond qui coupait le registre en silence : le journal
   * disait « les 200 dernières actions seulement », ce qui est un aveu et non
   * une réponse — pour une association active, 200 lignes font une semaine.
   */
  @IsOptional()
  @IsString()
  cursor?: string;
}

/** L'export ne pagine pas : il prend les mêmes filtres, sans curseur ni page. */
export class ExportHistoryDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsISO8601()
  since?: string;
}
