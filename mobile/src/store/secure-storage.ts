import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Stockage du jeton de session.
 *
 * Sur iOS et Android : `expo-secure-store`, adossé au Keychain et au Keystore.
 *
 * Sur le web : `localStorage`. `expo-secure-store` n'a **aucune**
 * implémentation web — c'est un module natif — et l'app plante sans ce repli.
 *
 * Le web n'est pas une cible de production : il sert à inspecter l'app pendant
 * le développement, faute de simulateur. `localStorage` n'offre pas les
 * garanties du trousseau et ne doit pas devenir la voie normale. Si le web
 * devait être livré un jour, ce repli est à remplacer par un cookie httpOnly
 * posé par le backend.
 */
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web')
      return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },

  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
