import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/** Un jour : au-delà, une étagère de la veille informe plus qu'elle ne trompe. */
const MAX_AGE = 1000 * 60 * 60 * 24;

/**
 * Le cache sur disque.
 *
 * Sans lui, fermer l'app dans le magasin vidait la liste : le cache ne vivait
 * qu'en mémoire, et il fallait du réseau pour la revoir — précisément ce qui
 * manque au fond d'un rayon.
 */
export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'restock-cache',
});

export const persistOptions = { persister, maxAge: MAX_AGE };

/**
 * Efface la copie disque.
 *
 * À appeler partout où l'on vide le cache mémoire : les données appartiennent
 * au compte qui vient de fermer sa session. Sans ça, le suivant à se connecter
 * verrait l'étagère du précédent restaurée depuis le disque — et cette
 * restauration-là survit au redémarrage, contrairement à l'ancienne fuite qui
 * ne durait qu'un refetch.
 */
export function purgePersistedCache(): void {
  void persister.removeClient();
}
