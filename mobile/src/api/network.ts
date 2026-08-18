import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * Branche l'état du réseau sur TanStack Query.
 *
 * Sans ça, `onlineManager` s'appuie sur son détecteur par défaut — celui du
 * navigateur, qui ne s'accroche à rien en React Native. L'app se croyait donc
 * **toujours** connectée : au lieu de mettre les gestes en pause, elle les
 * envoyait, `fetch` échouait, et `retry: false` en faisait un échec sec.
 *
 * Tout le hors-ligne tient à cet appel : une fois le manager informé, c'est la
 * bibliothèque qui met en pause et qui reprend.
 */
export function trackNetwork(): void {
  onlineManager.setEventListener((setOnline) => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // `isInternetReachable` vaut `null` le temps de la sonde : le traiter
      // comme une coupure ferait clignoter l'app en « hors-ligne » à chaque
      // démarrage. Seul un `false` franc — le wifi d'hôtel qui ne mène nulle
      // part — compte comme une absence de réseau.
      const reachable = state.isInternetReachable !== false;
      setOnline(Boolean(state.isConnected) && reachable);
    });

    if (Platform.OS !== 'web') return unsubscribe;

    // Sur le web, NetInfo choisit sa source : dès que `navigator.connection`
    // existe — c'est le cas de Chromium — il n'écoute plus que l'événement
    // `change` de cette API, et jamais `online`/`offline`. Une coupure franche
    // ne changeant pas le type de connexion, elle passait inaperçue. On ajoute
    // donc la source que le navigateur, lui, met à jour.
    const fromBrowser = () => setOnline(navigator.onLine);
    window.addEventListener('online', fromBrowser);
    window.addEventListener('offline', fromBrowser);

    return () => {
      unsubscribe();
      window.removeEventListener('online', fromBrowser);
      window.removeEventListener('offline', fromBrowser);
    };
  });
}

/** L'état réseau, tel que TanStack Query le voit — donc celui qui fait foi. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
    () => true,
  );
}
