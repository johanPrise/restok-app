import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  /**
   * Normalisé avant validation : l'email sert d'identifiant de connexion, et
   * `Alice@Test.dev` ne doit pas créer un second compte à côté de
   * `alice@test.dev`.
   */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @Length(1, 255)
  email?: string;
}
