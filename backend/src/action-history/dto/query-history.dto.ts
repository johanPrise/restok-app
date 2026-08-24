import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/** Deux semaines de journal tiennent à l'écran ; au-delà on filtre. */
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
   * Plafonné : un journal est fait pour être relu, pas téléchargé d'un bloc.
   * L'export, quand il viendra, sera une route à part.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;
}
