import { useSession } from '@/store/session';
import { ApiError, apiRequest, RequestOptions } from './client';
import { purgePersistedCache } from './persist';
import { queryClient } from './query-client';

/**
 * Requête authentifiée, avec correction du cache de session.
 *
 * - **401** : le token ne vaut plus rien — expiré, ou compte supprimé, puisque
 *   `JwtStrategy` relit le membre en base à chaque appel. On termine la session
 *   ici plutôt que de laisser chaque écran s'en charger.
 * - **403** sur une route « membre » : le serveur dit que l'appelant n'a pas de
 *   groupe alors que la session locale en mémorise un. C'est le cas d'un membre
 *   retiré depuis un autre appareil ; on aligne la session sur le serveur, qui
 *   fait foi.
 */
export async function authedRequest<T>(
  path: string,
  options: Omit<RequestOptions, 'token'> = {},
): Promise<T> {
  const { token } = useSession.getState();

  try {
    return await apiRequest<T>(path, { ...options, token });
  } catch (error) {
    if (error instanceof ApiError) await reconcileSession(error);
    throw error;
  }
}

async function reconcileSession(error: ApiError): Promise<void> {
  const { member, signOut, setMember } = useSession.getState();

  if (error.isUnauthenticated) {
    await signOut();
    // Le cache appartient au compte qui vient de sauter. Sans ce vidage, le
    // prochain à se connecter voyait l'étagère du précédent le temps d'un
    // refetch — `staleTime` la tient trente secondes.
    queryClient.clear();
    // Et sur disque, où elle survivrait maintenant au redémarrage.
    purgePersistedCache();
    return;
  }

  if (error.status === 403 && member?.groupId) {
    await setMember({ ...member, groupId: null, role: 'member' });
    // Idem pour un membre retiré de son groupe : les items, l'historique et la
    // liste des membres ne le regardent plus.
    queryClient.clear();
    purgePersistedCache();
  }
}
