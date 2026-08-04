import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PushMessage,
  PushProvider,
  PushSendResult,
} from './push-provider.interface';

export const DEFAULT_EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Expo refuse les lots de plus de 100 messages. */
const MAX_MESSAGES_PER_REQUEST = 100;

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data?: ExpoTicket[];
}

@Injectable()
export class ExpoPushAdapter implements PushProvider {
  private readonly logger = new Logger(ExpoPushAdapter.name);
  private readonly pushUrl: string;

  // Surchargeable pour pointer un stub en test ou en staging, plutôt que de
  // taper l'API publique d'Expo.
  constructor(@Optional() config?: ConfigService) {
    this.pushUrl =
      config?.get<string>('EXPO_PUSH_URL') ?? DEFAULT_EXPO_PUSH_URL;
  }

  async send(messages: PushMessage[]): Promise<PushSendResult[]> {
    const results: PushSendResult[] = [];

    for (let i = 0; i < messages.length; i += MAX_MESSAGES_PER_REQUEST) {
      const chunk = messages.slice(i, i + MAX_MESSAGES_PER_REQUEST);
      results.push(...(await this.sendChunk(chunk)));
    }

    return results;
  }

  private async sendChunk(messages: PushMessage[]): Promise<PushSendResult[]> {
    try {
      const response = await fetch(this.pushUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages.map((m) => ({ ...m, sound: 'default' }))),
      });

      if (!response.ok) {
        return this.failAll(messages, `HTTP ${response.status}`);
      }

      const json = (await response.json()) as ExpoPushResponse;

      return messages.map((message, index) => {
        const ticket = json.data?.[index];

        // Un ticket manquant est un échec, pas un succès : la version du §6
        // teste `receipt?.status !== 'error'`, ce qui déclare réussi un envoi
        // dont on n'a aucune trace.
        if (!ticket) {
          return {
            token: message.to,
            success: false,
            error: 'Réponse Expo incomplète',
          };
        }

        return ticket.status === 'error'
          ? {
              token: message.to,
              success: false,
              error: ticket.details?.error ?? ticket.message,
            }
          : { token: message.to, success: true };
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erreur inconnue';
      this.logger.warn(`Envoi push échoué : ${reason}`);
      return this.failAll(messages, reason);
    }
  }

  private failAll(messages: PushMessage[], error: string): PushSendResult[] {
    return messages.map((m) => ({ token: m.to, success: false, error }));
  }
}
