import { IsString, MaxLength } from 'class-validator';

export class UpdatePushTokenDto {
  @IsString()
  @MaxLength(255)
  pushToken: string;
}
