import { IsEmail, IsString, Length, MinLength } from 'class-validator';
import { INVITE_CODE_LENGTH } from '../../groups/invite-code';

/** Aligné sur RegisterDto : un mot de passe neuf n'a pas de raison d'être plus faible. */
const MIN_PASSWORD_LENGTH = 8;

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  /**
   * Redemandé, et non déduit du code.
   *
   * Le code n'est stocké que sous forme de hash bcrypt, qu'on ne peut pas
   * interroger : il faut savoir de qui on parle avant de comparer. L'app le
   * porte de l'écran précédent, personne ne le retape.
   */
  @IsEmail()
  email: string;

  @IsString()
  @Length(INVITE_CODE_LENGTH, INVITE_CODE_LENGTH)
  code: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;
}
