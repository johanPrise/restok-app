import { IsString, Length } from 'class-validator';

export class UpdateGroupDto {
  @IsString()
  @Length(2, 100)
  name: string;
}
