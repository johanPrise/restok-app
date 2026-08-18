import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { TrackingType } from '../entities/item.entity';

export class CreateItemDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsOptional()
  @IsEnum(TrackingType)
  trackingType?: TrackingType;

  /** Obligatoire en mode `quantity`, ignoré sinon. */
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  lowThreshold?: number;

  /** Quantité « plein », référence de la jauge. Défaut : la quantité initiale. */
  @IsOptional()
  @IsInt()
  @Min(1)
  targetQuantity?: number;

  /** Nom d'une unité : « rouleau », « bidon ». Étiquette d'affichage. */
  @IsOptional()
  @IsString()
  @Length(1, 20)
  unit?: string;

  /** Unités par paquet. Deux au minimum — un « paquet de 1 » n'en est pas un. */
  @IsOptional()
  @IsInt()
  @Min(2)
  packSize?: number;

  /** Ce qui est écrit sur l'étiquette : « 1,5 L », « 500 g ». Descriptif seul. */
  @IsOptional()
  @IsString()
  @Length(1, 20)
  format?: string;
}
