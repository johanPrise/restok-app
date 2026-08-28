import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { MailMessage, MailProvider } from './mail-provider.interface';

/**
 * L'envoi réel, par SMTP.
 *
 * SMTP plutôt que l'API d'un fournisseur : Resend, Postmark, SendGrid et une
 * boîte quelconque en donnent tous les identifiants, et changer de maison ne
 * touche alors que des variables d'environnement.
 *
 * `MAIL_URL` porte tout — `smtps://utilisateur:motdepasse@serveur:465`. Une
 * seule variable plutôt que cinq : c'est la forme sous laquelle les
 * fournisseurs la donnent, et elle se pose telle quelle dans un secret.
 */
@Injectable()
export class SmtpMailAdapter implements MailProvider {
  private readonly logger = new Logger(SmtpMailAdapter.name);
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.transport = createTransport(config.getOrThrow<string>('MAIL_URL'));
    this.from = config.getOrThrow<string>('MAIL_FROM');
  }

  async send(message: MailMessage): Promise<void> {
    try {
      await this.transport.sendMail({ ...message, from: this.from });
    } catch (error) {
      // Le message ne dit pas à qui l'envoi était destiné : les journaux d'un
      // hébergeur se lisent à plusieurs, et une adresse y traînerait.
      this.logger.error(
        `Envoi email échoué : ${error instanceof Error ? error.message : 'cause inconnue'}`,
      );

      // Remonté, et non avalé : quelqu'un attend un code. Lui répondre « c'est
      // envoyé » quand rien n'est parti le ferait patienter devant une boîte
      // vide, ce qui est pire que l'échec.
      throw new ServiceUnavailableException(
        'L’email n’a pas pu partir. Réessaie dans un moment.',
      );
    }
  }
}
