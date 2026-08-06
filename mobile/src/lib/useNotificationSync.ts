import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { queryKeys } from '@/api/query-client';

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
 */
export function useNotificationSync(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items });
    };

    const received = Notifications.addNotificationReceivedListener(refresh);
    const opened =
      Notifications.addNotificationResponseReceivedListener(refresh);

    return () => {
      received.remove();
      opened.remove();
    };
  }, [queryClient]);
}
