import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Le token voyage dans le corps, pas dans l'en-tête `Authorization`.
 *
 * Celui-ci porte l'access token, y compris sur cette route : il est
 * généralement expiré au moment où l'on rafraîchit, et l'y mêler ferait passer
 * deux jetons de natures différentes par le même canal.
 *
 * Les bornes tiennent lieu de garde-fou plutôt que de validation : 32 octets en
 * base64url font 43 caractères, et refuser tout de suite ce qui n'a pas la
 * bonne taille évite d'aller hacher n'importe quel corps de requête.
 */
export class RefreshTokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  refreshToken: string;
}
