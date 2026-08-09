import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { TrackingType } from '../entities/item.entity';

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsEnum(TrackingType)
  trackingType?: TrackingType;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  lowThreshold?: number;

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
}
