import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsoleMailAdapter } from './console-mail.adapter';
import { MAIL_PROVIDER, MailProvider } from './mail-provider.interface';
import { SmtpMailAdapter } from './smtp-mail.adapter';

/**
 * Quel adaptateur monte, et pourquoi ce n'est pas au hasard.
 *
 * Le SMTP dès que `MAIL_URL` est posée, la console sinon — de sorte qu'on
 * déroule « mot de passe oublié » en local sans compte chez personne.
 *
 * **Mais pas en production.** Là-bas, l'absence de configuration fait échouer
 * le démarrage plutôt que de se replier sur la console : une porte de
 * récupération qui n'écrit que dans les journaux n'existe pas, et on ne s'en
 * apercevrait que le jour où quelqu'un a besoin d'entrer. Mieux vaut un
 * déploiement qui refuse de partir qu'une promesse silencieuse.
 */
@Module({
  providers: [
    {
      provide: MAIL_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MailProvider => {
        const url = config.get<string>('MAIL_URL');

        if (url) return new SmtpMailAdapter(config);

        if (config.get<string>('NODE_ENV') === 'production') {
          throw new Error(
            'MAIL_URL et MAIL_FROM sont requis en production : sans eux, « mot de passe oublié » n’enverrait rien.',
          );
        }

        return new ConsoleMailAdapter();
      },
    },
  ],
  exports: [MAIL_PROVIDER],
})
export class MailModule {}
