import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { GroupType } from '../entities/group.entity';

export class CreateGroupDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsOptional()
  @IsEnum(GroupType)
  type?: GroupType;
}
