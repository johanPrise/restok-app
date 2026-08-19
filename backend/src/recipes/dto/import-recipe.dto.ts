import { IsString, IsUrl, Length } from 'class-validator';

export class ImportRecipeDto {
  /**
   * L'adresse de la page que l'utilisateur est en train de lire dans l'app.
   *
   * Il ne la tape jamais : c'est le navigateur intégré qui la fournit au moment
   * où l'on appuie sur « Sauvegarder ».
   */
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @Length(1, 2000)
  url: string;
}
