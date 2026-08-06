import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Expo Go ne reçoit plus de notifications distantes depuis le SDK 53 :
 * `getExpoPushTokenAsync` **lève une erreur** sur Android et n'aboutit pas sur
 * iOS. Il faut un development build.
 */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export type PushRegistration =
  | { outcome: 'registered'; token: string }
  /** L'utilisateur a refusé, ou a déjà refusé une fois au niveau système. */
  | { outcome: 'denied' }
  /** La permission est acquise mais aucun token n'est obtenable ici. */
  | {
      outcome: 'unavailable';
      reason: 'expo-go' | 'simulator' | 'no-project-id';
    };

/**
 * Demande la permission puis récupère le token Expo.
 *
 * Rendue distincte de l'écran qui l'appelle : c'est le seul endroit qui sait
 * dans quelles conditions un token est réellement obtenable, et l'interface
 * n'a qu'à traiter le résultat.
 */
export async function registerForPush(): Promise<PushRegistration> {
  // Sur Android le canal doit exister *avant* la demande, sinon l'invite
  // système ne s'affiche pas.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Stocks',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const granted = await requestPermission();
  if (!granted) return { outcome: 'denied' };

  // Un simulateur n'a pas de jeton d'appareil : la permission passe, le token
  // jamais.
  if (!Device.isDevice) return { outcome: 'unavailable', reason: 'simulator' };
  if (isExpoGo) return { outcome: 'unavailable', reason: 'expo-go' };

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as
    string | undefined;
  if (!projectId) return { outcome: 'unavailable', reason: 'no-project-id' };

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return { outcome: 'registered', token: data };
}

async function requestPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  // Une fois refusée, la demande ne réaffiche plus rien : il faut passer par
  // les réglages système. `canAskAgain` le dit.
  if (!existing.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}
