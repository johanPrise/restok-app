export interface MailMessage {
  to: string;
  subject: string;
  /** Texte brut. L'app n'envoie pas de HTML : rien ici n'a besoin d'être mis en page. */
  text: string;
}

export interface MailProvider {
  send(message: MailMessage): Promise<void>;
}

export const MAIL_PROVIDER = 'MAIL_PROVIDER';

/**
 * L'envoi d'email, derrière une interface.
 *
 * C'est le seul canal qui atteint quelqu'un qui **ne peut pas se connecter** —
 * ni le push, qui suppose une session, ni l'app elle-même. Il n'existait donc
 * pas de « mot de passe oublié » tant qu'il n'existait pas.
 *
 * Le fournisseur n'est pas choisi ici. L'adaptateur SMTP marche avec Resend,
 * Postmark, SendGrid ou une boîte quelconque — tous en donnent les
 * identifiants — plutôt que d'attacher le projet à l'API d'une maison en
 * particulier.
 */
