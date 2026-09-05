import { Injectable, Logger } from '@nestjs/common';
import { MailMessage, MailProvider } from './mail-provider.interface';

/**
 * L'envoi de développement : il écrit dans la console.
 *
 * Il permet de dérouler « mot de passe oublié » de bout en bout sans compte
 * chez personne — le code apparaît dans les journaux du serveur.
 *
 * `MailModule` refuse de le monter en production : là-bas, un envoi qui n'est
 * qu'une ligne de log serait une porte de récupération qui n'existe pas, et
 * personne ne s'en apercevrait avant d'en avoir besoin.
 */
@Injectable()
export class ConsoleMailAdapter implements MailProvider {
  private readonly logger = new Logger(ConsoleMailAdapter.name);

  send(message: MailMessage): Promise<void> {
    this.logger.log(
      `Email non envoyé (mode développement) → ${message.to}\n${message.subject}\n${message.text}`,
    );

    return Promise.resolve();
  }
}
