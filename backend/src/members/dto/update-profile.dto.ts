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
  // `value` est typé `any` par class-transformer : le déclarer `unknown` rend
  // le test de type obligatoire, et c'est lui qui protège le `.toLowerCase()`.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @Length(1, 255)
  email?: string;

  /**
   * Exigé **uniquement** pour changer l'email.
   *
   * L'email est l'identifiant de connexion : sans cette barrière, un téléphone
   * déverrouillé laissé sur une table suffit à s'approprier le compte. Le nom,
   * lui, ne donne accès à rien et ne demande donc rien.
   */
  @IsOptional()
  @IsString()
  @Length(1, 128)
  currentPassword?: string;
}
