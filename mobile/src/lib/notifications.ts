import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Depuis le SDK 53, `expo-notifications` **lève une erreur à l'import même**
 * dans Expo Go sur Android — pas au premier appel, à l'évaluation du module.
 *
 * Un garde à l'intérieur des fonctions arrive donc trop tard : `import ... from
 * 'expo-notifications'` en tête de fichier suffit à faire tomber tout ce qui
 * dépend de ce fichier, layout racine compris. D'où le chargement dynamique,
 * conditionné avant d'y toucher.
 */
export const canLoadNotifications = !(isExpoGo && Platform.OS === 'android');

type NotificationsModule = typeof import('expo-notifications');

export async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!canLoadNotifications) return null;

  return import('expo-notifications');
}
