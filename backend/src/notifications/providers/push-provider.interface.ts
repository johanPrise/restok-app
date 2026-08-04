export interface PushMessage {
  to: string;
  title: string;
  body: string;
}

export interface PushSendResult {
  token: string;
  success: boolean;
  error?: string;
}

export interface PushProvider {
  send(messages: PushMessage[]): Promise<PushSendResult[]>;
}

export const PUSH_PROVIDER = 'PUSH_PROVIDER';

/**
 * Signalé par Expo quand l'app a été désinstallée ou le token révoqué. Seule
 * erreur qui justifie d'oublier le token — un échec réseau ne dit rien sur sa
 * validité.
 */
export const DEVICE_NOT_REGISTERED = 'DeviceNotRegistered';
