import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { INVITE_CODE_LENGTH, normalizeInviteCode } from '../invite-code';

export class JoinGroupDto {
  /**
   * Normalisé avant validation, pas après : le code est collé depuis un groupe
   * de discussion et arrive souvent avec une espace ou en minuscules. Laisser
   * `@Length` s'exécuter d'abord rejetterait « AB2CD3EF » en 400 pour cause de
   * 9 caractères.
   */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeInviteCode(value) : value,
  )
  @IsString()
  @Length(INVITE_CODE_LENGTH, INVITE_CODE_LENGTH)
  inviteCode: string;
}
