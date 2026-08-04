import { Injectable } from '@nestjs/common';
import {
  PushMessage,
  PushProvider,
  PushSendResult,
} from '../../src/notifications/providers/push-provider.interface';

/**
 * Remplace ExpoPushAdapter en e2e : enregistre les envois au lieu de sortir sur
 * le réseau, et permet de simuler des échecs Expo.
 */
@Injectable()
export class RecordingPushProvider implements PushProvider {
  /** Un élément par appel à `send` — permet de vérifier le regroupement. */
  readonly batches: PushMessage[][] = [];

  private outcome: (message: PushMessage) => PushSendResult = (message) => ({
    token: message.to,
    success: true,
  });

  send(messages: PushMessage[]): Promise<PushSendResult[]> {
    this.batches.push(messages);
    return Promise.resolve(messages.map(this.outcome));
  }

  get messages(): PushMessage[] {
    return this.batches.flat();
  }

  get tokens(): string[] {
    return this.messages.map((m) => m.to);
  }

  clear(): void {
    this.batches.length = 0;
  }

  /** Fait échouer les envois vers `token` avec l'erreur Expo donnée. */
  failFor(token: string, error: string): void {
    this.outcome = (message) =>
      message.to === token
        ? { token: message.to, success: false, error }
        : { token: message.to, success: true };
  }

  succeedAlways(): void {
    this.outcome = (message) => ({ token: message.to, success: true });
  }

  /**
   * Les events partent après commit et le listener n'est pas attendu par la
   * requête HTTP : il faut laisser la notification arriver.
   */
  async waitForMessages(count: number, timeoutMs = 2000): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (this.messages.length < count && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  /** Laisse passer le temps d'un envoi éventuel, pour prouver qu'il n'y en a pas. */
  async settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}
