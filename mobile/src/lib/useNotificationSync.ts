import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '@/api/query-client';
import { loadNotifications } from './notifications';

/**
 * Une notification signale toujours qu'un item a changé d'état. Plutôt que de
 * transporter la donnée dans le payload — qui serait déjà périmée à
 * l'ouverture — on invalide le cache et on laisse TanStack Query refaire la
 * requête.
 *
 * Deux moments distincts :
 * - **reçue** : l'app est au premier plan, l'étagère est peut-être à l'écran
 *   et doit se corriger sous les yeux de l'utilisateur ;
 * - **ouverte** : l'app était en arrière-plan, l'utilisateur a tapé la
 *   notification et arrive sur des données figées depuis un moment.
 *
 * Le module est chargé dynamiquement : dans Expo Go sur Android son import
 * suffirait à faire tomber le layout racine, qui monte ce hook.
 */
export function useNotificationSync(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let disposers: (() => void)[] = [];
    let cancelled = false;

    void loadNotifications().then((Notifications) => {
      if (!Notifications || cancelled) return;

      // Le gestionnaire décide de ce qu'on affiche quand une notification
      // arrive app ouverte ; sans lui, le système ne montre rien.
      Notifications.setNotificationHandler({
        handleNotification: () =>
          Promise.resolve({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            // Le badge suit le nombre d'items à racheter, pas le cumul des
            // notifications reçues.
            shouldSetBadge: false,
          }),
      });

      const refresh = () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.items });
      };

      const received = Notifications.addNotificationReceivedListener(refresh);
      const opened =
        Notifications.addNotificationResponseReceivedListener(refresh);
      disposers = [() => received.remove(), () => opened.remove()];
    });

    return () => {
      cancelled = true;
      disposers.forEach((dispose) => dispose());
    };
  }, [queryClient]);
}
