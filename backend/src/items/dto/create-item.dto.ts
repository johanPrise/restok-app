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
}
