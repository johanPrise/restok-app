import { IsString, Length } from 'class-validator';
import { INVITE_CODE_LENGTH } from '../invite-code';

export class JoinGroupDto {
  // La normalisation (casse, espaces) est faite dans le service.
  @IsString()
  @Length(INVITE_CODE_LENGTH, INVITE_CODE_LENGTH)
  inviteCode: string;
}
