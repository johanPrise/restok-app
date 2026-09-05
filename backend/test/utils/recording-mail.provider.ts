import { Injectable } from '@nestjs/common';
import {
  MailMessage,
  MailProvider,
} from '../../src/mail/mail-provider.interface';

/**
 * Remplace l'envoi SMTP en e2e : garde les messages au lieu de sortir sur le
 * réseau. C'est aussi ce qui permet de lire le code envoyé, donc de dérouler
 * « mot de passe oublié » de bout en bout.
 */
@Injectable()
export class RecordingMailProvider implements MailProvider {
  readonly messages: MailMessage[] = [];

  send(message: MailMessage): Promise<void> {
    this.messages.push(message);
    return Promise.resolve();
  }

  last(): MailMessage | undefined {
    return this.messages.at(-1);
  }

  clear(): void {
    this.messages.length = 0;
  }
}
